import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createWorkflow, artifactPath, inferWorkflowIdFromArtifact, loadWorkflow } from '../src/workflow/artifacts.js';
import { tempProject } from './helpers.js';

test('creates workflow layout and infers id from artifact path', () => {
  const root = tempProject();
  const workflow = createWorkflow(root, 'Hello world');
  const artifact = artifactPath(root, workflow.id, 'clarify');
  assert.equal(inferWorkflowIdFromArtifact(artifact), workflow.id);
  assert.equal(loadWorkflow(root, workflow.id).task, 'Hello world');
  assert.equal(path.basename(artifact), 'clarify.md');
});
