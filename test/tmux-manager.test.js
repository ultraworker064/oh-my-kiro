import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStageCommand, sessionName } from '../src/tmux/tmux-manager.js';

test('tmux session names are deterministic and command runs stage wrapper', () => {
  assert.equal(sessionName('/tmp/my-project'), 'omk-my-project');
  const command = buildStageCommand('/tmp/x/.omk/workflows/id/evidence/clarify.wrapper-config.json');
  assert.match(command, /stage-wrapper\.js/);
  assert.match(command, /clarify\.wrapper-config\.json/);
});
