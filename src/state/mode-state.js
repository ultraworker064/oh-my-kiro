import path from 'node:path';
import { omkPath, readJson, writeJson, ensureDir } from './store.js';
import { evaluateTransition } from './workflow-transition.js';

export const WORKFLOW_MODES = ['deep-interview', 'ralplan', 'ralph'];

export function createSessionId(mode, slug = 'session', now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const safe = String(slug || mode).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || mode;
  return `${mode}-${stamp}-${safe}`;
}

export function modeStatePath(root, mode) {
  return omkPath(root, 'state', `${mode}-state.json`);
}

export function sessionPath(root, sessionId) {
  return omkPath(root, 'sessions', sessionId, 'session.json');
}

export function readModeState(root, mode) {
  return readJson(modeStatePath(root, mode), null);
}

export function listModeStates(root) {
  return WORKFLOW_MODES.map((mode) => readModeState(root, mode)).filter(Boolean);
}

export function activeModes(root) {
  return listModeStates(root).filter((state) => state.active).map((state) => state.mode);
}

export function startMode(root, mode, task, { sessionId = createSessionId(mode, task), artifactPaths = [], kiro = null } = {}) {
  const transition = evaluateTransition(activeModes(root), mode);
  if (!transition.allowed) {
    const error = new Error(`Cannot start ${mode}: ${transition.denialReason}`);
    error.exitCode = 1;
    throw error;
  }
  for (const oldMode of transition.autoCompleteModes) {
    const old = readModeState(root, oldMode);
    if (old?.active) writeModeState(root, { ...old, active: false, current_phase: 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  const state = {
    mode,
    active: true,
    current_phase: 'running',
    session_id: sessionId,
    task_description: task,
    artifact_paths: artifactPaths,
    kiro,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
  };
  writeModeState(root, state);
  writeSessionState(root, state);
  return state;
}

export function completeMode(root, mode, patch = {}) {
  const existing = readModeState(root, mode);
  if (!existing) throw new Error(`No state for mode: ${mode}`);
  const state = { ...existing, ...patch, active: false, current_phase: patch.current_phase || 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  writeModeState(root, state);
  writeSessionState(root, state);
  return state;
}

export function cancelMode(root, target) {
  const state = resolveModeOrSession(root, target);
  const cancelled = { ...state, active: false, current_phase: 'cancelled', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  writeModeState(root, cancelled);
  writeSessionState(root, cancelled);
  return cancelled;
}

export function resolveModeOrSession(root, target) {
  if (!target) throw new Error('Expected mode or session id');
  const byMode = readModeState(root, target);
  if (byMode) return byMode;
  for (const state of listModeStates(root)) if (state.session_id === target) return state;
  const error = new Error(`No mode/session found: ${target}`);
  error.exitCode = 1;
  throw error;
}

export function writeModeState(root, state) {
  writeJson(modeStatePath(root, state.mode), state);
  const modesPath = omkPath(root, 'state', 'modes.json');
  const modes = readJson(modesPath, { modes: [] });
  modes.modes = [state, ...modes.modes.filter((item) => item.mode !== state.mode)].slice(0, 20);
  writeJson(modesPath, modes);
}

export function writeSessionState(root, state) {
  ensureDir(path.dirname(sessionPath(root, state.session_id)));
  writeJson(sessionPath(root, state.session_id), state);
}
