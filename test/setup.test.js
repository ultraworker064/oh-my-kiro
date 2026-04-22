import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupKiro, doctor } from '../src/setup/kiro-install.js';
import { setupSteering } from '../src/setup/kiro-steering.js';
import { tempProject, fakeKiro, fakeTmux } from './helpers.js';

test('setup dry-run reports installer without writing config', () => {
  const root = tempProject();
  const result = setupKiro(root, { dryRun: true });
  assert.equal(result.ok, true);
  assert.match(result.actions.join('\n'), /install command|Detected Kiro/);
});

test('setup records supplied Kiro binary and writes steering files', () => {
  const root = tempProject();
  setupKiro(root, { kiroBin: fakeKiro });
  const written = setupSteering(root);
  assert.ok(written.includes('.kiro/steering/omk-product.md'));
  const config = JSON.parse(fs.readFileSync(`${root}/.omk/config.json`, 'utf8'));
  assert.equal(config.kiroBin, fakeKiro);
});

test('doctor reports detected fake Kiro and fake tmux', () => {
  const root = tempProject();
  const result = doctor(root, { kiroBin: fakeKiro, tmuxBin: fakeTmux });
  assert.equal(result.ok, true);
  assert.equal(result.kiro.found, true);
  assert.equal(result.tmux.found, true);
});
