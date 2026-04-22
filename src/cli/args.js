const BOOLEAN_FLAGS = new Set(['dry-run', 'no-tmux', 'no-attach', 'attach', 'force', 'resume', 'skip-kiro-install', 'help']);
const VALUE_FLAGS = new Set(['cwd', 'workflow-id', 'kiro-bin', 'tmux-bin', 'timeout-ms']);

export function parseArgs(argv) {
  const [commandRaw, ...rest] = argv;
  const command = commandRaw && !commandRaw.startsWith('-') ? commandRaw : undefined;
  const args = command ? rest : argv;
  const options = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) { positionals.push(token); continue; }
    const [flagName, inlineValue] = token.slice(2).split(/=(.*)/s).filter((part) => part !== undefined);
    if (BOOLEAN_FLAGS.has(flagName)) { options[toCamel(flagName)] = inlineValue === undefined ? true : inlineValue !== 'false'; continue; }
    if (VALUE_FLAGS.has(flagName)) {
      const value = inlineValue ?? args[++i];
      if (value === undefined) throw new Error(`Missing value for --${flagName}`);
      options[toCamel(flagName)] = flagName === 'timeout-ms' ? Number(value) : value;
      continue;
    }
    throw new Error(`Unknown option --${flagName}`);
  }
  return { command: command ?? (options.help ? 'help' : undefined), options, positionals };
}

function toCamel(value) { return value.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()); }

export function usage() {
  return `oh-my-kiro (omk) - Kiro CLI workflow sidecar

Usage:
  omk setup [--dry-run] [--skip-kiro-install] [--kiro-bin <path>] [--force]
  omk doctor [--kiro-bin <path>] [--tmux-bin <path>]
  omk deep-interview "<task>" [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk ralplan <artifact-or-task> [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk ralph <artifact-or-task> [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk status [--cwd <path>]
  omk resume <session-id-or-mode>
  omk cancel <session-id-or-mode>

Options:
  --cwd <path>          Run against a project directory (default: current directory)
  --kiro-bin <path>     Use an explicit Kiro CLI binary
  --tmux-bin <path>     Use an explicit tmux binary
  --no-tmux             Run Kiro wrapper directly while preserving artifacts/evidence
  --dry-run             Show setup actions without mutating install state
  --force               Allow overwriting managed setup files
`;
}
