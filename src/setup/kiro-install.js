import { spawnSync } from 'node:child_process';
import { KIRO_INSTALL_COMMAND } from '../config/defaults.js';
import { loadConfig, saveConfig } from '../state/store.js';
import { commandExists, resolveKiroBinary, invokeHelp } from '../kiro/kiro-command.js';

export function detectKiro(root, explicitBin) {
  const binary = resolveKiroBinary({ root, kiroBin: explicitBin });
  if (!binary) return { found: false, binary: null };
  return { found: commandExists(binary, root), binary };
}

export function setupKiro(root, options = {}) {
  const actions = [];
  const config = loadConfig(root);
  if (options.kiroBin) {
    config.kiroBin = options.kiroBin;
    actions.push(`Using supplied Kiro CLI binary: ${options.kiroBin}`);
    if (!options.dryRun) saveConfig(root, config);
    return { ok: true, actions, config };
  }
  const detected = detectKiro(root);
  if (detected.found) {
    config.kiroBin = detected.binary;
    actions.push(`Detected Kiro CLI binary: ${detected.binary}`);
    if (!options.dryRun) saveConfig(root, config);
    return { ok: true, actions, config };
  }
  if (options.skipKiroInstall) {
    actions.push('Kiro CLI not found; installation skipped by --skip-kiro-install.');
    return { ok: false, actions, config };
  }
  actions.push(`Kiro CLI not found; install command: ${KIRO_INSTALL_COMMAND}`);
  if (options.dryRun) return { ok: true, actions, config, dryRun: true };
  const result = spawnSync(KIRO_INSTALL_COMMAND, { shell: true, encoding: 'utf8', stdio: 'pipe' });
  const stdout = result.stdout?.trim();
  if (stdout) actions.push(stdout);
  if (result.status !== 0) {
    const error = new Error(`Kiro CLI installation failed: ${result.stderr || result.stdout || 'unknown error'}`);
    error.exitCode = result.status || 1;
    error.actions = actions;
    throw error;
  }
  const after = detectKiro(root);
  if (!after.found) {
    const error = new Error('Kiro installer completed but kiro-cli/kiro is still not on PATH.');
    error.exitCode = 1;
    error.actions = actions;
    throw error;
  }
  config.kiroBin = after.binary;
  saveConfig(root, config);
  actions.push(`Installed/detected Kiro CLI binary: ${after.binary}`);
  return { ok: true, actions, config };
}

export function doctor(root, options = {}) {
  const detected = detectKiro(root, options.kiroBin);
  const tmuxBin = options.tmuxBin || 'tmux';
  const tmux = spawnSync(tmuxBin, ['-V'], { encoding: 'utf8' });
  const kiroHelp = detected.found ? invokeHelp(detected.binary) : null;
  return {
    ok: detected.found && tmux.status === 0,
    kiro: {
      found: detected.found,
      binary: detected.binary,
      helpExitCode: kiroHelp?.status ?? null,
    },
    tmux: {
      found: tmux.status === 0,
      binary: tmuxBin,
      version: tmux.stdout?.trim() || null,
      error: tmux.stderr?.trim() || tmux.error?.message || null,
    },
  };
}
