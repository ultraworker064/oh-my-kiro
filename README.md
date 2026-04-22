# oh-my-kiro

`oh-my-kiro` is a build-from-source initiative to port the most important `oh-my-codex` workflow ideas to the Kiro CLI platform.

Milestone 1 implements a local `omk` sidecar runtime around Kiro CLI. Kiro remains the AI/model/chat frontend; `omk` owns workflow commands, tmux lifecycle, local artifacts, state, and evidence.

## Milestone 1 scope

The first supported workflow is:

```text
Clarify -> Plan -> Execute -> Verify
```

Each step is independently callable:

```bash
node bin/omk.js clarify "<task>"
node bin/omk.js plan .omk/workflows/<id>/clarify.md
node bin/omk.js execute .omk/workflows/<id>/plan.md
node bin/omk.js verify .omk/workflows/<id>/execute.md
node bin/omk.js workflow "<task>"
```

Support commands:

```bash
node bin/omk.js setup --dry-run
node bin/omk.js setup
node bin/omk.js doctor
```

`omk setup` detects or installs Kiro CLI, records the selected binary under `.omk/config.json`, and writes minimal Kiro steering/agent files. If Kiro is already installed somewhere unusual, pass `--kiro-bin <path>`.

## Constraints

- Kiro CLI is used as the model/chat frontend; `oh-my-kiro` does not implement a custom AI chat runtime.
- Workflow operation must not depend on Kiro MCP or internet access.
- `oh-my-kiro` self-manages tmux because Kiro CLI has no tmux-specific behavior for this project.
- Automated real-Kiro tests are invocation-only; actual Kiro CLI behavior validation is manual.

## Runtime artifacts

Workflow state is written under `.omk/`:

```text
.omk/
  config.json
  state/
  workflows/<workflow-id>/
    workflow.json
    prompts/
    clarify.md
    plan.md
    execute.md
    verify.md
    evidence/
    logs/
```

## Development

Run deterministic tests with fake Kiro and fake tmux fixtures:

```bash
npm test
```

Run invocation-only Kiro CLI smoke tests:

```bash
npm run test:kiro-invoke
```

If `kiro-cli` is not installed, the invocation smoke test is skipped by design.

Manual Kiro behavior validation, conducted by the user after implementation:

```bash
node bin/omk.js clarify "summarize the README and constraints"
node bin/omk.js workflow "perform a tiny safe repository change and verify it"
```

## Out of scope for Milestone 1

- Team/swarm workers (Milestone 2)
- Full Ralph-style persistence (Milestone 3)
- Visual verdict / web-clone
- Notifications
- OpenClaw / Hermes adapters
- Code-intel AST tooling
- Exact Codex compatibility shims
