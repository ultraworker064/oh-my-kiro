import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runCli } from '../src/cli/commands.js';
import { fakeKiro, fakeTmux, tempProject } from './helpers.js';

async function run(args, root) {
  const oldLog = console.log;
  const output = [];
  console.log = (...items) => output.push(items.join(' '));
  const oldExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    await runCli([...args, '--cwd', root, '--kiro-bin', fakeKiro, '--tmux-bin', fakeTmux]);
    return { status: process.exitCode || 0, stdout: output.join('\n'), stderr: '' };
  } catch (error) {
    return { status: error.exitCode || 1, stdout: output.join('\n'), stderr: `Error: ${error.message}` };
  } finally {
    console.log = oldLog;
    process.exitCode = oldExitCode;
  }
}

test('new OMX-like mode workflow writes artifacts and status', async () => {
  const root = tempProject();
  const deep = await run(['deep-interview', 'build auth'], root);
  assert.equal(deep.status, 0, deep.stderr);
  const spec = deep.stdout.match(/Spec: (.*)/)?.[1].trim();
  assert.ok(spec && fs.existsSync(spec));

  const plan = await run(['ralplan', spec], root);
  assert.equal(plan.status, 0, plan.stderr);
  const prd = plan.stdout.match(/PRD: (.*)/)?.[1].trim();
  assert.ok(prd && fs.existsSync(prd));
  const testSpec = plan.stdout.match(/Test spec: (.*)/)?.[1].trim();
  assert.ok(testSpec && fs.existsSync(testSpec));

  const ralph = await run(['ralph', prd], root);
  assert.equal(ralph.status, 0, ralph.stderr);
  const verification = ralph.stdout.match(/Verification: (.*)/)?.[1].trim();
  assert.ok(verification && fs.existsSync(verification));

  const status = await run(['status'], root);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /deep-interview/);
  assert.match(status.stdout, /ralplan/);
  assert.match(status.stdout, /ralph/);
});

test('old commands are rejected with migration guidance', async () => {
  const root = tempProject();
  for (const cmd of ['clarify', 'plan', 'execute', 'verify', 'workflow']) {
    const result = await run([cmd, 'x'], root);
    assert.notEqual(result.status, 0, cmd);
    assert.match(result.stderr, /has been removed/);
  }
});

test('cancel marks mode inactive and resume prints recovery', async () => {
  const root = tempProject();
  const deep = await run(['deep-interview', 'cancel me'], root);
  assert.equal(deep.status, 0, deep.stderr);
  const resume = await run(['resume', 'deep-interview'], root);
  assert.equal(resume.status, 0, resume.stderr);
  assert.match(resume.stdout, /Resume:|No tmux metadata/);
  const cancel = await run(['cancel', 'deep-interview'], root);
  assert.equal(cancel.status, 0, cancel.stderr);
  assert.match(cancel.stdout, /Cancelled deep-interview/);
  const state = JSON.parse(fs.readFileSync(`${root}/.omk/state/deep-interview-state.json`, 'utf8'));
  assert.equal(state.active, false);
  assert.equal(state.current_phase, 'cancelled');
});
