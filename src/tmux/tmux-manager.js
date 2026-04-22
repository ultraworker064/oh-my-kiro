import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TIMEOUT_MS } from '../config/defaults.js';
import { projectSlug } from '../workflow/id.js';
import { omkPath, readJson, writeJson } from '../state/store.js';
import { resolveKiroBinary, buildInteractiveKiroArgs } from '../kiro/kiro-command.js';

function run(command, args, opts = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...opts });
}

export function resolveTmuxBinary(tmuxBin) {
  return tmuxBin || 'tmux';
}

export function sessionName(root) {
  return `omk-${projectSlug(root)}`;
}

export function buildStageCommand(configPath) {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const absoluteWrapper = path.resolve(moduleDir, '..', 'kiro', 'stage-wrapper.js');
  return `node ${shellQuote(absoluteWrapper)} ${shellQuote(configPath)}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function recordSession(root, record) {
  const file = omkPath(root, 'state', 'sessions.json');
  const state = readJson(file, { sessions: [] });
  state.sessions = [record, ...state.sessions.filter((item) => !(item.workflowId === record.workflowId && item.stage === record.stage))].slice(0, 200);
  writeJson(file, state);
}

export function runStageInTmux({ root, workflowId, stage, configPath, resultPath, tmuxBin, noTmux = false, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const session = sessionName(root);
  const window = `${stage}-${workflowId.slice(0, 8)}`;
  const pane = `${session}:${window}`;
  const metadata = { session, window, pane, mode: noTmux ? 'direct' : 'tmux' };
  if (noTmux) return { metadata, executed: false };

  const binary = resolveTmuxBinary(tmuxBin);
  const hasSession = run(binary, ['has-session', '-t', session]);
  if (hasSession.status !== 0) {
    const created = run(binary, ['new-session', '-d', '-s', session, '-n', 'omk']);
    if (created.status !== 0) {
      const error = new Error(`tmux session creation failed: ${created.stderr || created.stdout}`);
      error.exitCode = 1;
      throw error;
    }
  }
  const command = buildStageCommand(configPath);
  const newWindow = run(binary, ['new-window', '-t', session, '-n', window, command], { cwd: root });
  if (newWindow.status !== 0) {
    const error = new Error(`tmux stage launch failed: ${newWindow.stderr || newWindow.stdout}`);
    error.exitCode = 1;
    throw error;
  }
  recordSession(root, { workflowId, stage, ...metadata, launchedAt: new Date().toISOString(), command });
  waitForResult(resultPath, timeoutMs);
  return { metadata, executed: true };
}

export function waitForResult(resultPath, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(resultPath)) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  const error = new Error(`Timed out waiting for stage result: ${resultPath}`);
  error.exitCode = 1;
  throw error;
}


export function buildInteractiveKiroCommand({ root, prompt, kiroBin }) {
  const binary = resolveKiroBinary({ root, kiroBin });
  if (!binary) {
    const error = new Error('Kiro CLI not found. Run `omk setup` or pass --kiro-bin <path>.');
    error.exitCode = 127;
    throw error;
  }
  return [binary, ...buildInteractiveKiroArgs({ prompt })].map(shellQuote).join(' ');
}

export function launchInteractiveKiroInTmux({ root, workflow, task, promptPath, resultPath, donePath, kiroBin, tmuxBin, attach = false, noAttach = false, noTmux = false }) {
  const shouldAttach = shouldAttachToTmux({ attach, noAttach, noTmux });
  if (!shouldAttach) return { launched: false, attached: false, reason: 'disabled-or-non-interactive' };
  const binary = resolveTmuxBinary(tmuxBin);
  const session = sessionName(root);
  const window = `kiro-${workflow.id.slice(0, 8)}`;
  const prompt = `Read ${promptPath} and follow the handoff instructions for: ${task}`;
  const kiroCommand = buildInteractiveKiroCommand({ root, prompt, kiroBin });
  const shellCommand = `printf 'omk interactive handoff prompt: ${shellQuote(promptPath)}\nResult file: ${shellQuote(resultPath)}\nDone sentinel: ${shellQuote(donePath)}\n\n'; ${kiroCommand}`;
  const hasSession = run(binary, ['has-session', '-t', session]);
  if (hasSession.status !== 0) {
    const created = run(binary, ['new-session', '-d', '-s', session, '-n', 'omk']);
    if (created.status !== 0) {
      const error = new Error(`tmux interactive session creation failed: ${created.stderr || created.stdout}`);
      error.exitCode = 1;
      throw error;
    }
  }
  const newWindow = run(binary, ['new-window', '-t', session, '-n', window, shellCommand], { cwd: root });
  if (newWindow.status !== 0) {
    const error = new Error(`tmux interactive Kiro window failed: ${newWindow.stderr || newWindow.stdout}`);
    error.exitCode = 1;
    throw error;
  }
  const target = `${session}:${window}`;
  const switchResult = process.env.TMUX ? run(binary, ['switch-client', '-t', target], { stdio: 'inherit' }) : run(binary, ['attach-session', '-t', target], { stdio: 'inherit' });
  recordSession(root, { workflowId: workflow.id, stage: 'interactive-handoff', session, window, pane: target, mode: 'interactive-kiro', launchedAt: new Date().toISOString(), command: shellCommand });
  return { launched: true, attached: switchResult.status === 0, target, command: shellCommand, exitCode: switchResult.status };
}

export function buildWorkflowSummary(root, workflow, { failedStage = null, recoveryCommand = null } = {}) {
  const lines = [
    '# omk workflow summary',
    '',
    `Workflow: ${workflow.id}`,
    `Task: ${workflow.task || ''}`,
    '',
    '## Stages',
  ];
  for (const [stage, state] of Object.entries(workflow.stages || {})) {
    lines.push(`- ${stage}: ${state.status}${state.artifactPath ? ` | artifact: ${state.artifactPath}` : ''}${state.evidencePath ? ` | evidence: ${state.evidencePath}` : ''}`);
  }
  const verifyState = workflow.stages?.verify;
  if (verifyState?.artifactPath) {
    lines.push('', `Final result: ${verifyState.artifactPath}`);
    const verdict = readVerdict(verifyState.artifactPath);
    if (verdict) lines.push(`Final verdict: ${verdict}`);
  }
  if (failedStage) {
    lines.push('', `Failed stage: ${failedStage}`);
  }
  if (recoveryCommand) {
    lines.push('', `Recovery: ${recoveryCommand}`);
  }
  lines.push('', 'You can inspect all artifacts under:', `${omkPath(root, 'workflows', workflow.id)}`, '');
  return lines.join('\n');
}

function readVerdict(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return text.match(/^Verdict:\s*(PASS|FAIL)/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function shouldAttachToTmux({ attach = false, noAttach = false, noTmux = false, env = process.env, stdout = process.stdout } = {}) {
  if (noTmux || noAttach || env.OMK_NO_ATTACH === '1') return false;
  if (attach) return true;
  if (env.CI) return false;
  return Boolean(stdout?.isTTY);
}

export function showWorkflowSummaryInTmux({ root, workflow, tmuxBin, attach = false, noAttach = false, noTmux = false, failedStage = null, recoveryCommand = null }) {
  const shouldAttach = shouldAttachToTmux({ attach, noAttach, noTmux });
  if (!shouldAttach) return { attached: false, reason: 'disabled-or-non-interactive' };
  const binary = resolveTmuxBinary(tmuxBin);
  const session = sessionName(root);
  const window = `summary-${workflow.id.slice(0, 8)}`;
  const summaryFile = omkPath(root, 'workflows', workflow.id, 'summary.md');
  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });
  fs.writeFileSync(summaryFile, buildWorkflowSummary(root, workflow, { failedStage, recoveryCommand }));
  const hasSession = run(binary, ['has-session', '-t', session]);
  if (hasSession.status !== 0) {
    const created = run(binary, ['new-session', '-d', '-s', session, '-n', 'omk']);
    if (created.status !== 0) {
      const error = new Error(`tmux summary session creation failed: ${created.stderr || created.stdout}`);
      error.exitCode = 1;
      throw error;
    }
  }
  const command = `cat ${shellQuote(summaryFile)}; printf '\nPress Ctrl-b d to detach from this omk tmux session.\n'; exec ${process.env.SHELL || 'sh'}`;
  const newWindow = run(binary, ['new-window', '-t', session, '-n', window, command], { cwd: root });
  if (newWindow.status !== 0) {
    const error = new Error(`tmux summary window failed: ${newWindow.stderr || newWindow.stdout}`);
    error.exitCode = 1;
    throw error;
  }
  const target = `${session}:${window}`;
  const switchResult = process.env.TMUX ? run(binary, ['switch-client', '-t', target], { stdio: 'inherit' }) : run(binary, ['attach-session', '-t', target], { stdio: 'inherit' });
  recordSession(root, { workflowId: workflow.id, stage: 'summary', session, window, pane: target, mode: 'summary', launchedAt: new Date().toISOString(), command });
  return { attached: switchResult.status === 0, target, summaryFile, exitCode: switchResult.status };
}
