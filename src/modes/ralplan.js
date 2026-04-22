import { startMode, completeMode } from '../state/mode-state.js';
import { artifactSlug, prdPath, testSpecPath } from '../artifacts/paths.js';
import { readText, writeText, pathExists } from '../state/store.js';
import { runKiroSession } from '../kiro/session-runner.js';
import { ralplanPrompt } from './prompts.js';

export function runRalplan(root, input, options = {}) {
  const source = pathExists(input) ? readText(input) : input;
  const slug = artifactSlug(source.slice(0, 80));
  const artifacts = { prd: prdPath(root, slug), testSpec: testSpecPath(root, slug) };
  const state = startMode(root, 'ralplan', input, { artifactPaths: Object.values(artifacts) });
  const result = runKiroSession(root, { sessionId: state.session_id, mode: 'ralplan', prompt: ralplanPrompt(source, artifacts), ...options });
  const content = pathExists(result.resultFile) ? readText(result.resultFile) : '';
  if (!pathExists(artifacts.prd)) writeText(artifacts.prd, content || `# PRD\n\n${source}\n`);
  if (!pathExists(artifacts.testSpec)) writeText(artifacts.testSpec, `# Test Spec\n\n${content || source}\n`);
  completeMode(root, 'ralplan', { artifact_paths: Object.values(artifacts), kiro: result.tmux });
  return { ...artifacts, sessionId: state.session_id };
}
