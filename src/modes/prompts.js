export function deepInterviewPrompt(task, artifacts) {
  return `You are Kiro running omk deep-interview.\n\nTask: ${task}\n\nClarify requirements, non-goals, decision boundaries, constraints, and acceptance criteria. Produce a concise deep-interview artifact.\n\nOutput paths expected by omk:\n- Interview: ${artifacts.interview}\n- Spec: ${artifacts.spec}\n\nIf you can write files, write both paths. Otherwise return markdown with the same content. Do not rely on MCP or internet.`;
}

export function ralplanPrompt(input, artifacts) {
  return `You are Kiro running omk ralplan.\n\nInput task/artifact:\n${input}\n\nCreate a consensus-style implementation plan with RALPLAN-DR summary, ADR, testable acceptance criteria, risks, and verification steps.\n\nOutput paths expected by omk:\n- PRD: ${artifacts.prd}\n- Test spec: ${artifacts.testSpec}\n\nIf you can write files, write both paths. Otherwise return markdown with both sections. Do not rely on MCP or internet.`;
}

export function ralphPrompt(input, artifacts) {
  return `You are Kiro running omk ralph.\n\nInput task/artifact:\n${input}\n\nExecute persistently until the plan is complete or genuinely blocked. Record progress, changed files, verification evidence, and final status.\n\nOutput paths expected by omk:\n- Progress: ${artifacts.progress}\n- Changed files: ${artifacts.changedFiles}\n- Verification: ${artifacts.verification}\n\nIf you can write files, write these paths. Otherwise return a verification report. Do not rely on MCP or internet.`;
}
