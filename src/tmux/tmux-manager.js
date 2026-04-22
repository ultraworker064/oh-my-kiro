import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TIMEOUT_MS } from '../config/defaults.js';
import { projectSlug } from '../workflow/id.js';
import { omkPath, readJson, writeJson } from '../state/store.js';

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
