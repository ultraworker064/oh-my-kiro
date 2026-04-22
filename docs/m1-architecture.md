# Milestone 1 Architecture

`omk` is a dependency-light Node.js CLI sidecar around Kiro CLI.

## Boundary

- Kiro CLI performs model/chat work.
- `omk` performs orchestration, tmux management, prompt generation, state persistence, and evidence capture.
- MCP and internet are not required for `omk` workflow operation.

## Stage execution

1. CLI command parses user input or prior artifact path.
2. Workflow state is created or loaded from `.omk/workflows/<id>/workflow.json`.
3. A stage prompt is written under `.omk/workflows/<id>/prompts/`.
4. `omk` launches a Node stage wrapper through a managed tmux session/window unless `--no-tmux` is used.
5. The wrapper invokes `kiro-cli chat --no-interactive --agent <stage-agent> <prompt>`.
6. stdout/stderr/evidence are written under `.omk/workflows/<id>/`.
7. The stage artifact path is printed for independent chaining.
8. For interactive `omk workflow` runs, `omk` writes a `summary.md` artifact and opens/switches/attaches to a tmux summary window showing workflow id, stage statuses, artifact/evidence paths, final result, and recovery command when applicable. Non-TTY, CI, `--no-attach`, `OMK_NO_ATTACH=1`, and `--no-tmux` keep background behavior.

## Setup

`omk setup` detects `kiro-cli`/`kiro`, or runs the official Kiro installer when missing. It also writes minimal `.kiro/steering/` and `.kiro/agents/` files for M1 stage prompts.

## Testing boundary

Fake Kiro/tmux fixtures cover deterministic workflow behavior. Real Kiro automated tests only check invocation/help behavior; semantic Kiro workflow validation is manual.
