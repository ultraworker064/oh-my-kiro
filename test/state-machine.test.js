import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyStageState, markStage } from '../src/workflow/state-machine.js';

test('valid stage transitions preserve evidence', () => {
  const workflow = { stages: { clarify: emptyStageState('clarify') } };
  markStage(workflow, 'clarify', 'running');
  markStage(workflow, 'clarify', 'completed', { artifactPath: 'clarify.md' });
  assert.equal(workflow.stages.clarify.status, 'completed');
  assert.equal(workflow.stages.clarify.artifactPath, 'clarify.md');
});

test('invalid stage transition throws', () => {
  const workflow = { stages: { plan: emptyStageState('plan') } };
  assert.throws(() => markStage(workflow, 'plan', 'completed'), /Invalid stage transition/);
});
