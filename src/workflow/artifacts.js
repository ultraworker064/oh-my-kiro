import path from 'node:path';
import { STAGES, STAGE_TO_ARTIFACT } from '../config/defaults.js';
import { ensureDir, omkPath, readJson, writeJson, writeText, pathExists } from '../state/store.js';
import { createWorkflowId } from './id.js';
import { emptyStageState } from './state-machine.js';

export function workflowDir(root, workflowId) {
  return omkPath(root, 'workflows', workflowId);
}

export function workflowFile(root, workflowId) {
  return path.join(workflowDir(root, workflowId), 'workflow.json');
}

export function artifactPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), STAGE_TO_ARTIFACT[stage]);
}

export function promptPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'prompts', `${stage}.md`);
}

export function evidencePath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'evidence', `${stage}.json`);
}

export function stdoutPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'logs', `${stage}.stdout.log`);
}

export function stderrPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'logs', `${stage}.stderr.log`);
}

export function wrapperConfigPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'evidence', `${stage}.wrapper-config.json`);
}

export function wrapperResultPath(root, workflowId, stage) {
  return path.join(workflowDir(root, workflowId), 'evidence', `${stage}.wrapper-result.json`);
}

export function inferWorkflowIdFromArtifact(file) {
  const resolved = path.resolve(file);
  const parts = resolved.split(path.sep);
  const idx = parts.lastIndexOf('workflows');
  if (idx === -1 || !parts[idx + 1]) {
    const error = new Error(`Cannot infer workflow id from artifact path: ${file}`);
    error.exitCode = 1;
    throw error;
  }
  return parts[idx + 1];
}

export function createWorkflow(root, task, workflowId = createWorkflowId(task)) {
  const dir = workflowDir(root, workflowId);
  for (const sub of ['', 'prompts', 'evidence', 'logs']) ensureDir(path.join(dir, sub));
  ensureDir(omkPath(root, 'state'));
  const workflow = {
    id: workflowId,
    task,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: Object.fromEntries(STAGES.map((stage) => [stage, emptyStageState(stage)])),
  };
  saveWorkflow(root, workflow);
  updateWorkflowIndex(root, workflow);
  return workflow;
}

export function loadWorkflow(root, workflowId) {
  const workflow = readJson(workflowFile(root, workflowId));
  if (!workflow) {
    const error = new Error(`Workflow not found: ${workflowId}`);
    error.exitCode = 1;
    throw error;
  }
  return workflow;
}

export function saveWorkflow(root, workflow) {
  writeJson(workflowFile(root, workflow.id), workflow);
  updateWorkflowIndex(root, workflow);
}

export function updateWorkflowIndex(root, workflow) {
  const indexFile = omkPath(root, 'state', 'workflows.json');
  const index = readJson(indexFile, { workflows: [] });
  const summary = { id: workflow.id, task: workflow.task, updatedAt: workflow.updatedAt, path: workflowFile(root, workflow.id) };
  index.workflows = [summary, ...index.workflows.filter((item) => item.id !== workflow.id)].slice(0, 100);
  writeJson(indexFile, index);
}

export function writePrompt(root, workflowId, stage, content) {
  writeText(promptPath(root, workflowId, stage), content);
}

export function assertCanWriteArtifact(root, workflowId, stage, { force = false } = {}) {
  const file = artifactPath(root, workflowId, stage);
  if (pathExists(file) && !force) {
    const error = new Error(`Refusing to overwrite completed artifact: ${file}`);
    error.hint = `Re-run with --force to regenerate ${stage}, or use the existing artifact.`;
    error.exitCode = 1;
    throw error;
  }
}
