import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bin, fakeKiro, fakeTmux, repoRoot, tempProject } from './helpers.js';

test('full workflow completes all four stages via CLI', () => {
  const root = tempProject();
  const result = spawnSync('node', [bin, 'workflow', 'create a tiny local artifact', '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const workflowDir = result.stdout.trim().split('\n').at(-1);
  for (const file of ['workflow.json', 'clarify.md', 'plan.md', 'execute.md', 'verify.md']) assert.ok(fs.existsSync(`${workflowDir}/${file}`), file);
  const workflow = JSON.parse(fs.readFileSync(`${workflowDir}/workflow.json`, 'utf8'));
  for (const stage of ['clarify', 'plan', 'execute', 'verify']) assert.equal(workflow.stages[stage].status, 'completed');
});

test('resume continues failed/pending workflow from next stage', () => {
  const root = tempProject();
  const clarify = spawnSync('node', [bin, 'clarify', 'task', '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(clarify.status, 0, clarify.stderr);
  const workflowId = clarify.stdout.match(/workflows\/([^/]+)\/clarify\.md/)?.[1];
  assert.ok(workflowId);
  const resumed = spawnSync('node', [bin, 'workflow', '--cwd', root, '--workflow-id', workflowId, '--resume', '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(resumed.status, 0, resumed.stderr);
  const workflow = JSON.parse(fs.readFileSync(`${root}/.omk/workflows/${workflowId}/workflow.json`, 'utf8'));
  assert.equal(workflow.stages.verify.status, 'completed');
});

test('resume after failed plan retries plan and completes workflow', () => {
  const root = tempProject();
  const clarify = spawnSync('node', [bin, 'clarify', 'task', '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(clarify.status, 0, clarify.stderr);
  const workflowId = clarify.stdout.match(/workflows\/([^/]+)\/clarify\.md/)?.[1];
  assert.ok(workflowId);
  const planFail = spawnSync('node', [bin, 'plan', `${root}/.omk/workflows/${workflowId}/clarify.md`, '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FAKE_KIRO_FAIL_STAGE: 'plan' },
  });
  assert.notEqual(planFail.status, 0);
  let workflow = JSON.parse(fs.readFileSync(`${root}/.omk/workflows/${workflowId}/workflow.json`, 'utf8'));
  assert.equal(workflow.stages.plan.status, 'failed');
  const resumed = spawnSync('node', [bin, 'workflow', '--cwd', root, '--workflow-id', workflowId, '--resume', '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(resumed.status, 0, resumed.stderr);
  workflow = JSON.parse(fs.readFileSync(`${root}/.omk/workflows/${workflowId}/workflow.json`, 'utf8'));
  assert.equal(workflow.stages.verify.status, 'completed');
  assert.match(fs.readFileSync(`${root}/.omk/workflows/${workflowId}/verify.md`, 'utf8'), /Verdict: PASS/);
});

test('failed workflow prints recovery command', () => {
  const root = tempProject();
  const result = spawnSync('node', [bin, 'workflow', 'task', '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FAKE_KIRO_FAIL_STAGE: 'execute' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Recovery: omk workflow --workflow-id .* --resume/);
});

test('bare workflow resume requires workflow id and does not create workflow', () => {
  const root = tempProject();
  const result = spawnSync('node', [bin, 'workflow', '--cwd', root, '--resume', '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /workflow --resume requires --workflow-id/);
  assert.equal(fs.existsSync(`${root}/.omk/workflows`), false);
});
