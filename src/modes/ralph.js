import path from 'node:path';
import { startMode, completeMode } from '../state/mode-state.js';
import { artifactSlug, ralphDir } from '../artifacts/paths.js';
import { readText, writeText, writeJson, pathExists } from '../state/store.js';
import { runKiroSession } from '../kiro/session-runner.js';
import { ralphPrompt } from './prompts.js';

export function runRalph(root, input, options = {}) {
  const source = pathExists(input) ? readText(input) : input;
  const slug = artifactSlug(source.slice(0, 80));
  const sessionId = `ralph-${slug}`;
  const dir = ralphDir(root, sessionId);
  const artifacts = { progress: path.join(dir, 'progress.json'), changedFiles: path.join(dir, 'changed-files.txt'), verification: path.join(dir, 'verification.md') };
  const state = startMode(root, 'ralph', input, { sessionId, artifactPaths: Object.values(artifacts) });
  const result = runKiroSession(root, { sessionId: state.session_id, mode: 'ralph', prompt: ralphPrompt(source, artifacts), ...options });
  const content = pathExists(result.resultFile) ? readText(result.resultFile) : '';
  if (!pathExists(artifacts.progress)) writeJson(artifacts.progress, { status: 'complete', updated_at: new Date().toISOString(), source: input });
  if (!pathExists(artifacts.changedFiles)) writeText(artifacts.changedFiles, '# changed files\n');
  if (!pathExists(artifacts.verification)) writeText(artifacts.verification, content || `# Ralph Verification\n\n${source}\n`);
  completeMode(root, 'ralph', { artifact_paths: Object.values(artifacts), kiro: result.tmux });
  return { ...artifacts, sessionId: state.session_id };
}
