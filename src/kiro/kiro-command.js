import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { loadConfig } from '../state/store.js';
import { MODE_TO_AGENT } from '../config/defaults.js';

export function commandExists(command, cwd = process.cwd()) {
  if (!command) return false;
  if (command.includes('/') || command.includes('\\')) return spawnSync(command, ['--help'], { cwd, encoding: 'utf8' }).error?.code !== 'ENOENT';
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'command', process.platform === 'win32' ? [command] : ['-v', command], { shell: process.platform !== 'win32', encoding: 'utf8' });
  return result.status === 0;
}

export function resolveKiroBinary({ root = process.cwd(), kiroBin } = {}) {
  if (kiroBin) return kiroBin;
  const config = loadConfig(root);
  if (config.kiroBin) return config.kiroBin;
  if (commandExists('kiro-cli', root)) return 'kiro-cli';
  if (commandExists('kiro', root)) return 'kiro';
  return null;
}

export function buildInteractiveKiroArgs({ prompt }) {
  return prompt ? ['chat', prompt] : ['chat'];
}

export function buildKiroArgs({ stage, prompt, trustTools = null }) {
  const args = ['chat', '--no-interactive', '--agent', MODE_TO_AGENT[stage] ?? `omk-${stage}`];
  if (trustTools) args.push('--trust-tools', trustTools);
  args.push(prompt);
  return args;
}

export function buildKiroInvocation({ root, stage, prompt, kiroBin, trustTools }) {
  const binary = resolveKiroBinary({ root, kiroBin });
  if (!binary) {
    const error = new Error('Kiro CLI not found. Run `omk setup` to install/detect Kiro CLI, or pass --kiro-bin <path>.');
    error.code = 'KIRO_NOT_FOUND';
    error.exitCode = 127;
    throw error;
  }
  return { command: binary, args: buildKiroArgs({ stage, prompt, trustTools }) };
}

export function invokeHelp(binary) {
  return spawnSync(binary, ['--help'], { encoding: 'utf8' });
}
