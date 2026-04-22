import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKiroArgs } from '../src/kiro/kiro-command.js';

test('Kiro command args are arrays and default conservative trust', () => {
  const args = buildKiroArgs({ stage: 'clarify', prompt: 'hello' });
  assert.deepEqual(args.slice(0, 4), ['chat', '--no-interactive', '--agent', 'omk-clarifier']);
  assert.equal(args.includes('--trust-all-tools'), false);
  assert.equal(args.at(-1), 'hello');
});
