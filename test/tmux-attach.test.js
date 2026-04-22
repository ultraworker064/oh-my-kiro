import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorkflowSummary, shouldAttachToTmux, showWorkflowSummaryInTmux } from '../src/tmux/tmux-manager.js';
import { createWorkflow } from '../src/workflow/artifacts.js';
import { markStage } from '../src/workflow/state-machine.js';
import { tempProject, fakeTmux } from './helpers.js';

test('attach decision respects TTY, CI, no-attach, env and force attach', () => {
  assert.equal(shouldAttachToTmux({ stdout: { isTTY: true }, env: {} }), true);
  assert.equal(shouldAttachToTmux({ stdout: { isTTY: true }, env: { CI: '1' } }), false);
  assert.equal(shouldAttachToTmux({ stdout: { isTTY: true }, env: { OMK_NO_ATTACH: '1' } }), false);
  assert.equal(shouldAttachToTmux({ noAttach: true, stdout: { isTTY: true }, env: {} }), false);
  assert.equal(shouldAttachToTmux({ noTmux: true, stdout: { isTTY: true }, env: {} }), false);
  assert.equal(shouldAttachToTmux({ attach: true, stdout: { isTTY: false }, env: {} }), true);
});

test('workflow summary includes statuses artifacts verdict and recovery', () => {
  fs.writeFileSync('/tmp/verify.md', '# verify\n\nVerdict: PASS\n');
  const workflow = { id: 'wf-1', task: 'task', stages: { verify: { status: 'completed', artifactPath: '/tmp/verify.md', evidencePath: '/tmp/verify.json' } } };
  const summary = buildWorkflowSummary('/tmp/project', workflow, { failedStage: 'execute', recoveryCommand: 'omk workflow --workflow-id wf-1 --resume' });
  assert.match(summary, /Workflow: wf-1/);
  assert.match(summary, /verify: completed/);
  assert.match(summary, /Final result: \/tmp\/verify.md/);
  assert.match(summary, /Final verdict: PASS/);
  assert.match(summary, /Recovery: omk workflow --workflow-id wf-1 --resume/);
});

test('showWorkflowSummaryInTmux writes summary and calls fake attach when forced', () => {
  const root = tempProject();
  const workflow = createWorkflow(root, 'visible summary');
  for (const stage of ['clarify', 'plan', 'execute', 'verify']) {
    markStage(workflow, stage, 'running');
    markStage(workflow, stage, 'completed', { artifactPath: `${root}/${stage}.md`, evidencePath: `${root}/${stage}.json` });
  }
  const log = path.join(root, 'fake-tmux.log');
  const oldLog = process.env.FAKE_TMUX_LOG;
  process.env.FAKE_TMUX_LOG = log;
  const result = showWorkflowSummaryInTmux({ root, workflow, tmuxBin: fakeTmux, attach: true });
  if (oldLog === undefined) delete process.env.FAKE_TMUX_LOG; else process.env.FAKE_TMUX_LOG = oldLog;
  assert.equal(result.attached, true);
  assert.match(fs.readFileSync(log, 'utf8'), /(attach-session|switch-client) -t omk-/);
  assert.ok(fs.existsSync(result.summaryFile));
  assert.match(fs.readFileSync(result.summaryFile, 'utf8'), /omk workflow summary/);
});

test('showWorkflowSummaryInTmux skips non-interactive default', () => {
  const root = tempProject();
  const workflow = createWorkflow(root, 'no attach');
  const result = showWorkflowSummaryInTmux({ root, workflow, tmuxBin: fakeTmux });
  assert.equal(result.attached, false);
});
