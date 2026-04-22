import { readText } from '../state/store.js';

const GLOBAL = `You are running inside Kiro CLI as the model/chat frontend for oh-my-kiro (omk).
Hard constraints:
- Do not assume internet access.
- Do not rely on MCP tools; MCP is unavailable for this project.
- Keep outputs as concrete markdown artifacts for the current stage.
- Respect Milestone 1 scope: no team/swarm, no Ralph persistence, no visual/web-clone, no notifications, no OpenClaw/Hermes, no code-intel AST tooling, no exact Codex compatibility shims.
`;

export function buildPrompt(stage, input, context = {}) {
  switch (stage) {
    case 'clarify':
      return `${GLOBAL}
# Stage: Clarify

Task statement:
${input}

Produce a concise clarification artifact with these sections:
- Intent
- Constraints
- Non-goals
- Acceptance criteria
- Unresolved questions
`;
    case 'plan':
      return `${GLOBAL}
# Stage: Plan

Clarification artifact:
${readText(input)}

Produce an implementation plan with these sections:
- Requirements summary
- Implementation steps with concrete file targets
- Risks and mitigations
- Verification plan
`;
    case 'execute':
      return `${GLOBAL}
# Stage: Execute

Plan artifact:
${readText(input)}

Execute the plan using Kiro CLI capabilities. Produce an execution artifact with:
- Actions taken
- Changed files
- Evidence collected
- Follow-up required
`;
    case 'verify':
      return `${GLOBAL}
# Stage: Verify

Execution artifact:
${readText(input)}

Verify the execution. Produce a verification artifact with:
- Verdict: PASS or FAIL
- Verification commands/results
- Evidence paths
- Remaining risks
`;
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}
