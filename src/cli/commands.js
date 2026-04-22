import { parseArgs, usage } from './args.js';
import { projectRoot } from '../state/store.js';
import { setupKiro, doctor } from '../setup/kiro-install.js';
import { setupSteering } from '../setup/kiro-steering.js';
import { runDeepInterview } from '../modes/deep-interview.js';
import { runRalplan } from '../modes/ralplan.js';
import { runRalph } from '../modes/ralph.js';
import { cancelMode, listModeStates, resolveModeOrSession } from '../state/mode-state.js';

const REMOVED_COMMANDS = {
  clarify: 'deep-interview "<task>"',
  plan: 'ralplan <artifact-or-task>',
  execute: 'ralph <plan-or-task>',
  verify: 'ralph <plan-or-task>',
  workflow: 'deep-interview "<task>" -> ralplan <spec> -> ralph <plan>',
};

export async function runCli(argv) {
  const { command, options, positionals } = parseArgs(argv);
  const root = projectRoot(options.cwd ?? process.cwd());
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }
  if (REMOVED_COMMANDS[command]) {
    const error = new Error(`omk ${command} has been removed. Use omk ${REMOVED_COMMANDS[command]} instead.`);
    error.exitCode = 1;
    throw error;
  }
  if (command === 'setup') {
    const result = setupKiro(root, options);
    const written = options.dryRun ? [] : setupSteering(root, { force: options.force });
    for (const action of result.actions) if (action) console.log(action);
    if (options.dryRun) console.log('Dry run: no setup files written.');
    else console.log(`Kiro steering/agent files written: ${written.length}`);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === 'doctor') {
    console.log(JSON.stringify(doctor(root, options), null, 2));
    return;
  }
  if (command === 'deep-interview') {
    const task = positionals.join(' ').trim();
    if (!task) throw usageError('deep-interview requires a task string');
    const result = runDeepInterview(root, task, options);
    console.log(`✅ Deep interview complete\nSpec: ${result.spec}\nInterview: ${result.interview}\nSession: ${result.sessionId}\nNext: omk ralplan ${result.spec}`);
    return;
  }
  if (command === 'ralplan') {
    const input = positionals.join(' ').trim();
    if (!input) throw usageError('ralplan requires a task or deep-interview artifact');
    const result = runRalplan(root, input, options);
    console.log(`✅ Plan complete\nPRD: ${result.prd}\nTest spec: ${result.testSpec}\nSession: ${result.sessionId}\nNext: omk ralph ${result.prd}`);
    return;
  }
  if (command === 'ralph') {
    const input = positionals.join(' ').trim();
    if (!input) throw usageError('ralph requires a task or plan artifact');
    const result = runRalph(root, input, options);
    console.log(`✅ Ralph complete\nProgress: ${result.progress}\nVerification: ${result.verification}\nChanged files: ${result.changedFiles}\nSession: ${result.sessionId}`);
    return;
  }
  if (command === 'status') {
    const states = listModeStates(root);
    if (states.length === 0) console.log('No omk mode sessions found.');
    else for (const state of states) console.log(`${state.mode}\t${state.current_phase}\tactive=${state.active}\tsession=${state.session_id}\tartifacts=${(state.artifact_paths || []).join(',')}`);
    return;
  }
  if (command === 'resume') {
    const target = positionals[0];
    const state = resolveModeOrSession(root, target);
    const pane = state.kiro?.pane || state.kiro?.target;
    const session = state.kiro?.session;
    console.log(pane || session ? `Resume: tmux attach-session -t ${pane || session}` : `No tmux metadata for ${target}. Re-run omk ${state.mode} with the original input.`);
    return;
  }
  if (command === 'cancel') {
    const target = positionals[0];
    const state = cancelMode(root, target);
    console.log(`Cancelled ${state.mode} (${state.session_id}); artifacts preserved.`);
    return;
  }
  throw usageError(`Unknown command: ${command}\n${usage()}`);
}

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 1;
  return error;
}
