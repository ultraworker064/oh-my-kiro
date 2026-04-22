import path from 'node:path';
import { omkPath } from '../state/store.js';

export function slugify(input) {
  return String(input || 'artifact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'artifact';
}

export function timestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function artifactSlug(input) {
  return `${slugify(input)}-${timestamp()}`;
}

export function interviewPath(root, slug) { return omkPath(root, 'interviews', `${slug}.md`); }
export function specPath(root, slug) { return omkPath(root, 'specs', `deep-interview-${slug}.md`); }
export function prdPath(root, slug) { return omkPath(root, 'plans', `prd-${slug}.md`); }
export function testSpecPath(root, slug) { return omkPath(root, 'plans', `test-spec-${slug}.md`); }
export function ralphDir(root, sessionId) { return omkPath(root, 'ralph', sessionId); }
export function sessionDir(root, sessionId) { return omkPath(root, 'sessions', sessionId); }
export function promptPath(root, sessionId) { return path.join(sessionDir(root, sessionId), 'prompt.md'); }
export function resultPath(root, sessionId) { return path.join(sessionDir(root, sessionId), 'result.md'); }
export function evidencePath(root, sessionId) { return path.join(sessionDir(root, sessionId), 'evidence.json'); }

export function projectSlug(root) {
  const parts = String(root).split(/[\\/]+/).filter(Boolean);
  return slugify(parts.at(-1) || 'project');
}
