import fs from 'node:fs';
import path from 'node:path';
import { OMK_DIR } from '../config/defaults.js';

export function projectRoot(cwd = process.cwd()) {
  return path.resolve(cwd);
}

export function omkPath(root, ...parts) {
  return path.join(root, OMK_DIR, ...parts);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export function writeJson(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function appendJsonLine(file, value) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`);
}

export function writeText(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

export function pathExists(file) {
  return fs.existsSync(file);
}

export function loadConfig(root) {
  return readJson(omkPath(root, 'config.json'), {});
}

export function saveConfig(root, config) {
  writeJson(omkPath(root, 'config.json'), config);
}
