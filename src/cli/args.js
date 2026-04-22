const BOOLEAN_FLAGS = new Set(['dry-run', 'no-tmux', 'force', 'resume', 'skip-kiro-install', 'help']);
const VALUE_FLAGS = new Set(['cwd', 'workflow-id', 'kiro-bin', 'tmux-bin', 'timeout-ms']);

export function parseArgs(argv) {
  const [commandRaw, ...rest] = argv;
  const command = commandRaw && !commandRaw.startsWith('-') ? commandRaw : (commandRaw ? undefined : undefined);
  const args = command ? rest : argv;
  const options = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const [flagName, inlineValue] = token.slice(2).split(/=(.*)/s).filter((part) => part !== undefined);
    if (BOOLEAN_FLAGS.has(flagName)) {
      options[toCamel(flagName)] = inlineValue === undefined ? true : inlineValue !== 'false';
      continue;
    }
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

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

export function usage() {
  return `oh-my-kiro (omk) - Kiro CLI workflow sidecar

Usage:
  omk setup [--dry-run] [--skip-kiro-install] [--kiro-bin <path>] [--force]
  omk doctor [--kiro-bin <path>] [--tmux-bin <path>]
  omk clarify "<task>" [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk plan <clarify-artifact> [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk execute <plan-artifact> [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk verify <execution-artifact> [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]
  omk workflow "<task>" [--workflow-id <id>] [--resume] [--kiro-bin <path>] [--tmux-bin <path>] [--no-tmux]

Options:
  --cwd <path>          Run against a project directory (default: current directory)
  --workflow-id <id>    Reuse/resume a workflow id
  --kiro-bin <path>     Use an explicit Kiro CLI binary
  --tmux-bin <path>     Use an explicit tmux binary
  --no-tmux             Run wrapper directly while preserving artifacts/evidence
  --dry-run             Show setup actions without mutating install state
  --force               Allow overwriting completed stage artifacts or managed setup files
`;
}
