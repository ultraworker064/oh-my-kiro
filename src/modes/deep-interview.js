import { startMode, completeMode } from '../state/mode-state.js';
import { artifactSlug, interviewPath, specPath } from '../artifacts/paths.js';
import { readText, writeText, pathExists } from '../state/store.js';
import { runKiroSession } from '../kiro/session-runner.js';
import { deepInterviewPrompt } from './prompts.js';

export function runDeepInterview(root, task, options = {}) {
  const slug = artifactSlug(task);
  const artifacts = { interview: interviewPath(root, slug), spec: specPath(root, slug) };
  const state = startMode(root, 'deep-interview', task, { artifactPaths: Object.values(artifacts) });
  const result = runKiroSession(root, { sessionId: state.session_id, mode: 'deep-interview', prompt: deepInterviewPrompt(task, artifacts), ...options });
  const content = pathExists(result.resultFile) ? readText(result.resultFile) : '';
  if (!pathExists(artifacts.interview)) writeText(artifacts.interview, content || `# Deep Interview\n\n${task}\n`);
  if (!pathExists(artifacts.spec)) writeText(artifacts.spec, content || `# Deep Interview Spec\n\n${task}\n`);
  completeMode(root, 'deep-interview', { artifact_paths: Object.values(artifacts), kiro: result.tmux });
  return { ...artifacts, sessionId: state.session_id };
}
