#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readJson, writeJson, writeText } from '../state/store.js';
import { buildKiroInvocation } from './kiro-command.js';

export function runStageWrapper(configPath) {
  const config = readJson(configPath);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let invocation = null;
  let errorMessage = null;
  try {
    invocation = buildKiroInvocation(config);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: config.root,
      encoding: 'utf8',
      env: { ...process.env, OMK_STAGE: config.stage, OMK_WORKFLOW_ID: config.workflowId },
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout ?? '';
    stderr = result.stderr ?? '';
    if (result.error) {
      exitCode = result.error.code === 'ENOENT' ? 127 : 1;
      errorMessage = result.error.message;
      stderr = `${stderr}${stderr ? '\n' : ''}${result.error.message}`;
    } else {
      exitCode = result.status ?? 0;
    }
  } catch (error) {
    exitCode = error.exitCode ?? 1;
    errorMessage = error.message;
    stderr = `${stderr}${stderr ? '\n' : ''}${error.message}`;
  }
  const completedAt = new Date().toISOString();
  writeText(config.stdoutPath, stdout);
  writeText(config.stderrPath, stderr);
  if (exitCode === 0) {
    writeText(config.artifactPath, stdout.trim() ? stdout : `# ${config.stage}\n\nKiro CLI completed without stdout.\n`);
  }
  const evidence = {
    stage: config.stage,
    workflowId: config.workflowId,
    startedAt,
    completedAt,
    durationMs: Date.now() - started,
    kiroCommand: invocation ? [invocation.command, ...invocation.args] : null,
    tmux: config.tmux ?? null,
    exitCode,
    stdoutPath: config.stdoutPath,
    stderrPath: config.stderrPath,
    artifactPath: config.artifactPath,
    error: errorMessage,
  };
  writeJson(config.evidencePath, evidence);
  writeJson(config.resultPath, evidence);
  return evidence;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: stage-wrapper <config.json>');
    process.exit(2);
  }
  const evidence = runStageWrapper(configPath);
  process.exit(evidence.exitCode === 0 ? 0 : 1);
}
