import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const bin = path.join(repoRoot, 'bin', 'omk.js');
export const fakeKiro = path.join(repoRoot, 'test', 'fixtures', 'fake-kiro-cli.js');
export const fakeTmux = path.join(repoRoot, 'test', 'fixtures', 'fake-tmux.js');

export function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omk-test-'));
  fs.writeFileSync(path.join(dir, 'README.md'), '# temp project\n');
  return dir;
}
