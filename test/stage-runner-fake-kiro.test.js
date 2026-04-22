import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runStage } from '../src/workflow/stage-runner.js';
import { artifactPath, loadWorkflow } from '../src/workflow/artifacts.js';
import { tempProject, fakeKiro, fakeTmux } from './helpers.js';

test('clarify creates artifact and evidence with fake Kiro/tmux', () => {
  const root = tempProject();
  const result = runStage(root, 'clarify', 'build a hello world file', { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  assert.ok(fs.existsSync(result.artifactPath));
  assert.match(fs.readFileSync(result.artifactPath, 'utf8'), /Fake Kiro response/);
  const workflow = loadWorkflow(root, result.workflow.id);
  assert.equal(workflow.stages.clarify.status, 'completed');
  assert.ok(fs.existsSync(workflow.stages.clarify.evidencePath));
});

test('repeat completed stage refuses overwrite without force', () => {
  const root = tempProject();
  const result = runStage(root, 'clarify', 'task', { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  assert.throws(() => runStage(root, 'clarify', 'task', { workflowId: result.workflow.id, kiroBin: fakeKiro, tmuxBin: fakeTmux }), /Refusing to overwrite/);
});

test('failed fake Kiro marks stage failed and preserves stderr', () => {
  const root = tempProject();
  const old = process.env.FAKE_KIRO_FAIL_STAGE;
  process.env.FAKE_KIRO_FAIL_STAGE = 'clarify';
  try {
    assert.throws(() => runStage(root, 'clarify', 'task', { kiroBin: fakeKiro, tmuxBin: fakeTmux }), /Stage clarify failed/);
    const workflows = fs.readdirSync(`${root}/.omk/workflows`);
    const workflow = loadWorkflow(root, workflows[0]);
    assert.equal(workflow.stages.clarify.status, 'failed');
    assert.match(fs.readFileSync(`${root}/.omk/workflows/${workflow.id}/logs/clarify.stderr.log`, 'utf8'), /fake kiro failure/);
  } finally {
    if (old === undefined) delete process.env.FAKE_KIRO_FAIL_STAGE;
    else process.env.FAKE_KIRO_FAIL_STAGE = old;
  }
});

test('missing Kiro binary fails clearly', () => {
  const root = tempProject();
  assert.throws(() => runStage(root, 'clarify', 'task', { kiroBin: './missing-kiro', noTmux: true }), /Stage clarify failed/);
  const id = fs.readdirSync(`${root}/.omk/workflows`)[0];
  const workflow = loadWorkflow(root, id);
  assert.equal(workflow.stages.clarify.status, 'failed');
  assert.match(fs.readFileSync(artifactPath(root, id, 'clarify').replace('clarify.md', 'logs/clarify.stderr.log'), 'utf8'), /Kiro CLI not found|ENOENT/);
});

test('plan execute and verify stages are independently callable with fake Kiro', () => {
  const root = tempProject();
  const clarify = runStage(root, 'clarify', 'task', { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  const plan = runStage(root, 'plan', clarify.artifactPath, { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  const execute = runStage(root, 'execute', plan.artifactPath, { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  const verify = runStage(root, 'verify', execute.artifactPath, { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  assert.match(fs.readFileSync(verify.artifactPath, 'utf8'), /Verdict: PASS/);
  assert.ok(fs.existsSync(`${root}/.omk/workflows/${verify.workflow.id}/evidence/commands.jsonl`));
});

test('force overwrite regenerates a completed stage', () => {
  const root = tempProject();
  const first = runStage(root, 'clarify', 'task', { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  const before = fs.statSync(first.artifactPath).mtimeMs;
  const second = runStage(root, 'clarify', 'task', { workflowId: first.workflow.id, kiroBin: fakeKiro, tmuxBin: fakeTmux, force: true });
  assert.equal(second.artifactPath, first.artifactPath);
  assert.ok(fs.statSync(second.artifactPath).mtimeMs >= before);
});

test('workflow prompts and commands do not require MCP or internet', () => {
  const root = tempProject();
  const result = runStage(root, 'clarify', 'task', { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  const prompt = fs.readFileSync(`${root}/.omk/workflows/${result.workflow.id}/prompts/clarify.md`, 'utf8');
  assert.match(prompt, /Do not assume internet access/);
  assert.match(prompt, /Do not rely on MCP tools/);
  const evidence = JSON.parse(fs.readFileSync(`${root}/.omk/workflows/${result.workflow.id}/evidence/clarify.json`, 'utf8'));
  assert.equal(evidence.kiroCommand.includes('--require-mcp-startup'), false);
  assert.equal(evidence.kiroCommand.some((arg) => /curl|fetch|http/i.test(arg) && arg !== prompt), false);
});
