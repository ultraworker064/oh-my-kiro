import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { commandExists } from '../src/kiro/kiro-command.js';

const binary = commandExists('kiro-cli') ? 'kiro-cli' : (commandExists('kiro') ? 'kiro' : null);

test('real Kiro CLI is invokable for help only', { skip: binary ? false : 'kiro-cli/kiro not installed in this environment' }, () => {
  const help = spawnSync(binary, ['--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  const chatHelp = spawnSync(binary, ['chat', '--help'], { encoding: 'utf8' });
  assert.equal(chatHelp.status, 0);
});
