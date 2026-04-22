#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const cmd = args[0];
if (process.env.FAKE_TMUX_LOG) {
  await import('node:fs').then(({ appendFileSync }) => appendFileSync(process.env.FAKE_TMUX_LOG, `${args.join(' ')}\n`));
}
if (cmd === '-V') {
  console.log('tmux fake-1.0');
  process.exit(0);
}
if (cmd === 'has-session') process.exit(process.env.FAKE_TMUX_HAS_SESSION === '1' ? 0 : 1);
if (cmd === 'new-session') process.exit(0);
if (cmd === 'new-window') {
  if (process.env.FAKE_TMUX_FAIL === '1') {
    console.error('fake tmux failure');
    process.exit(3);
  }
  const command = args.at(-1);
  spawnSync(command, { shell: true, encoding: 'utf8', stdio: 'inherit' });
  // Real tmux only reports whether the pane/window launched; the child command
  // result is recorded by the wrapper evidence file.
  process.exit(0);
}
if (cmd === 'attach-session' || cmd === 'switch-client') process.exit(0);
if (cmd === 'capture-pane') process.exit(0);
process.exit(0);
