# OMK Workflow Architecture

`omk` is a Kiro-backed workflow orchestrator modeled after the main `oh-my-codex` flow.

## Public workflow

```bash
omk deep-interview "<task>"
omk ralplan .omk/specs/deep-interview-<slug>.md
omk ralph .omk/plans/prd-<slug>.md
```

The old `clarify -> plan -> execute -> verify` command model is removed from the public product surface.

## Boundary

- Kiro CLI performs model/chat work.
- `omk` manages mode/session state, tmux metadata, prompts, and artifacts.
- Artifacts live under `.omk/` and are the durable source of truth.
- Terminal output is a short operator summary and next command.

## Mode lifecycle

Each mode writes `.omk/state/<mode>-state.json` and `.omk/sessions/<session-id>/session.json`.

State phases use a small OMX-inspired subset:

```text
running -> complete | cancelled | failed | blocked_on_user
```

Supported mode transitions:

```text
deep-interview -> ralplan
ralplan -> ralph
```

## Commands

- `omk status` lists known mode states and artifact paths.
- `omk resume <mode-or-session>` prints the tmux attach/recovery command when metadata is available.
- `omk cancel <mode-or-session>` marks state cancelled and preserves artifacts.

## Testing boundary

Automated tests use fake Kiro/fake tmux fixtures. Real Kiro CLI behavior is validated manually in a user environment with Kiro installed.
