import path from 'node:path';
import { parseArgs, usage } from './args.js';
import { projectRoot } from '../state/store.js';
import { runStage, runWorkflow } from '../workflow/stage-runner.js';
import { setupKiro, doctor } from '../setup/kiro-install.js';
import { setupSteering } from '../setup/kiro-steering.js';

export async function runCli(argv) {
  const { command, options, positionals } = parseArgs(argv);
  const root = projectRoot(options.cwd ?? process.cwd());
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
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
    const result = doctor(root, options);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (['clarify', 'plan', 'execute', 'verify'].includes(command)) {
    const input = positionals[0];
    if (!input) {
      const error = new Error(command === 'clarify' ? 'clarify requires a task string' : `${command} requires a prior stage artifact path`);
      error.exitCode = 1;
      throw error;
    }
    const result = runStage(root, command, pathMaybe(root, input), options);
    console.log(result.artifactPath);
    return;
  }
  if (command === 'workflow') {
    const task = positionals.join(' ').trim();
    if (options.resume && !options.workflowId) {
      const error = new Error('workflow --resume requires --workflow-id <id>');
      error.hint = 'Recovery: omk workflow --workflow-id <id> --resume';
      error.exitCode = 1;
      throw error;
    }
    if (!task && !options.resume) {
      const error = new Error('workflow requires a task string, or --resume with --workflow-id');
      error.exitCode = 1;
      throw error;
    }
    const result = runWorkflow(root, task, options);
    console.log(result.workflowDir);
    return;
  }
  const error = new Error(`Unknown command: ${command}\n${usage()}`);
  error.exitCode = 1;
  throw error;
}

function pathMaybe(root, input) {
  if (input.includes('/') || input.endsWith('.md')) return path.resolve(root, input);
  return input;
}
