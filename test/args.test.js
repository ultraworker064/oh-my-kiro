import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, usage } from '../src/cli/args.js';

test('help lists M1 commands', () => {
  const text = usage();
  for (const cmd of ['setup', 'doctor', 'clarify', 'plan', 'execute', 'verify', 'workflow']) assert.match(text, new RegExp(`omk ${cmd}`));
});

test('parse command options and positionals', () => {
  const parsed = parseArgs(['clarify', 'hello world', '--kiro-bin', 'fake', '--no-tmux']);
  assert.equal(parsed.command, 'clarify');
  assert.deepEqual(parsed.positionals, ['hello world']);
  assert.equal(parsed.options.kiroBin, 'fake');
  assert.equal(parsed.options.noTmux, true);
});
