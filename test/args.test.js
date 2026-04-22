import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, usage } from '../src/cli/args.js';

test('help lists OMX-like commands and omits old workflow commands', () => {
  const text = usage();
  for (const cmd of ['setup', 'doctor', 'deep-interview', 'ralplan', 'ralph', 'status', 'resume', 'cancel']) assert.match(text, new RegExp(`omk ${cmd}`));
  for (const cmd of ['clarify', 'execute', 'verify', 'workflow']) assert.doesNotMatch(text, new RegExp(`omk ${cmd}`));
});

test('parse command options and positionals', () => {
  const parsed = parseArgs(['deep-interview', 'hello world', '--kiro-bin', 'fake', '--no-tmux']);
  assert.equal(parsed.command, 'deep-interview');
  assert.deepEqual(parsed.positionals, ['hello world']);
  assert.equal(parsed.options.kiroBin, 'fake');
  assert.equal(parsed.options.noTmux, true);
});
