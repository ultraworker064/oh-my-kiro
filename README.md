# oh-my-kiro

`oh-my-kiro` ports the main `oh-my-codex` workflow model to Kiro CLI. Kiro remains the model/chat frontend; `omk` manages local workflow modes, tmux sessions, artifacts, and status under `.omk/`.

## Main workflow

Use the same high-level flow as OMX:

```bash
omk deep-interview "clarify the feature"
omk ralplan .omk/specs/deep-interview-<slug>.md
omk ralph .omk/plans/prd-<slug>.md
```

Each command prints a concise terminal summary with the produced artifact path and the next command to run. Full details live in durable `.omk/` artifacts.

## Session commands

```bash
omk status
omk resume <session-id-or-mode>
omk cancel <session-id-or-mode>
```

- `status` lists mode state and artifact paths.
- `resume` prints the tmux attach/recovery command for a mode/session.
- `cancel` marks a mode/session cancelled while preserving artifacts.

## Setup

```bash
omk setup
omk doctor
```

If Kiro is installed in a non-standard location, pass `--kiro-bin <path>`.

## Runtime artifacts

```text
.omk/
  state/
    modes.json
    deep-interview-state.json
    ralplan-state.json
    ralph-state.json
  sessions/<session-id>/
    prompt.md
    result.md
    evidence.json
  interviews/
  specs/
  plans/
  ralph/
```

## Removed old workflow

The old four-stage workflow has been removed from the public product model:

```text
omk clarify
omk plan
omk execute
omk verify
omk workflow
```

Use `deep-interview -> ralplan -> ralph` instead.

## Constraints

- Kiro CLI is the model/chat frontend; `omk` is not a custom AI chat runtime.
- Automated tests do not require real Kiro model calls.
- Kiro MCP and internet access are not required by `omk` workflow tests.

## Development

```bash
npm test
npm run test:kiro-invoke
npm pack --dry-run
```

The Kiro invocation smoke test is skipped when `kiro-cli`/`kiro` is unavailable.
