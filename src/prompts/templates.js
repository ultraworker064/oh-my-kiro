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


export function buildInteractiveHandoffPrompt({ task, resultPath, donePath }) {
  return `${GLOBAL}
# Interactive omk handoff

You are the visible interactive Kiro CLI session for this omk workflow.

User's starting task:
${task}

Chat with the user until the request is clear. When the user is ready for omk to run background jobs, write the final agreed result to:
${resultPath}

Then create/touch this done sentinel:
${donePath}

The result file should include:
- Final clarified task
- Constraints
- Non-goals
- Acceptance criteria
- Notes needed for background plan/execute/verify

If Kiro cannot write files directly in this environment, clearly instruct the user to create those files manually in another shell, then detach from tmux with Ctrl-b d.
`;
}
