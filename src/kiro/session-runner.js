import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { writeJson, writeText } from '../state/store.js';
import { promptPath, resultPath, evidencePath } from '../artifacts/paths.js';
import { buildKiroInvocation } from './kiro-command.js';
import { runStageInTmux } from '../tmux/tmux-manager.js';

export function runKiroSession(root, { sessionId, mode, prompt, kiroBin, tmuxBin, noTmux = false, timeoutMs = 120000 }) {
  const promptFile = promptPath(root, sessionId);
  const resultFile = resultPath(root, sessionId);
  const evidenceFile = evidencePath(root, sessionId);
  writeText(promptFile, prompt);
  const config = {
    root,
    workflowId: sessionId,
    stage: mode,
    prompt,
    kiroBin,
    artifactPath: resultFile,
    evidencePath: evidenceFile,
    stdoutPath: `${resultFile}.stdout.log`,
    stderrPath: `${resultFile}.stderr.log`,
    resultPath: `${evidenceFile}.result.json`,
    tmux: null,
  };
  const configPath = `${evidenceFile}.config.json`;
  writeJson(configPath, config);
  if (noTmux) return runKiroDirect(config);
  const launch = runStageInTmux({ root, workflowId: sessionId, stage: mode, configPath, resultPath: config.resultPath, tmuxBin, timeoutMs });
  const evidence = awaitEvidence(config.resultPath);
  evidence.tmux = evidence.tmux || launch.metadata;
  writeJson(evidenceFile, evidence);
  return { resultFile, evidenceFile, evidence, tmux: launch.metadata };
}

function runKiroDirect(config) {
  const startedAt = new Date().toISOString();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let command = null;
  try {
    const invocation = buildKiroInvocation(config);
    command = [invocation.command, ...invocation.args];
    const result = spawnSync(invocation.command, invocation.args, { cwd: config.root, encoding: 'utf8', env: { ...process.env, OMK_MODE: config.stage }, maxBuffer: 10 * 1024 * 1024 });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
    if (result.error) {
      exitCode = result.error.code === 'ENOENT' ? 127 : 1;
      stderr = `${stderr}${stderr ? '\n' : ''}${result.error.message}`;
    } else exitCode = result.status || 0;
  } catch (error) {
    exitCode = error.exitCode || 1;
    stderr = `${stderr}${stderr ? '\n' : ''}${error.message}`;
  }
  writeText(config.artifactPath, stdout.trim() || `# ${config.stage}\n\nNo Kiro output captured.\n`);
  writeText(config.stdoutPath, stdout);
  writeText(config.stderrPath, stderr);
  const evidence = { stage: config.stage, sessionId: config.workflowId, startedAt, completedAt: new Date().toISOString(), kiroCommand: command, exitCode, artifactPath: config.artifactPath, stderrPath: config.stderrPath, stdoutPath: config.stdoutPath, error: exitCode === 0 ? null : stderr };
  writeJson(config.evidencePath, evidence);
  writeJson(config.resultPath, evidence);
  if (exitCode !== 0) {
    const err = new Error(`${config.stage} Kiro session failed; see ${config.stderrPath}`);
    err.exitCode = exitCode;
    throw err;
  }
  return { resultFile: config.artifactPath, evidenceFile: config.evidencePath, evidence, tmux: { mode: 'direct' } };
}

function awaitEvidence(file) {
  const start = Date.now();
  while (Date.now() - start < 120000) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error(`Timed out waiting for evidence: ${file}`);
}
