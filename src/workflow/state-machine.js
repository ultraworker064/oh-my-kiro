const ALLOWED = {
  pending: new Set(['running']),
  running: new Set(['completed', 'failed']),
  failed: new Set(['running']),
  completed: new Set(['running']),
};

export function assertTransition(from, to, { force = false } = {}) {
  if (from === to) return;
  if (force && from === 'completed' && to === 'running') return;
  if (!ALLOWED[from]?.has(to)) {
    const error = new Error(`Invalid stage transition: ${from} -> ${to}`);
    error.exitCode = 1;
    throw error;
  }
}

export function emptyStageState(stage) {
  return { stage, status: 'pending', artifactPath: null, evidencePath: null, error: null };
}

export function markStage(workflow, stage, status, patch = {}, opts = {}) {
  workflow.stages ??= {};
  const current = workflow.stages[stage] ?? emptyStageState(stage);
  assertTransition(current.status, status, opts);
  workflow.stages[stage] = {
    ...current,
    ...patch,
    stage,
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === 'running') workflow.stages[stage].startedAt = new Date().toISOString();
  if (status === 'completed' || status === 'failed') workflow.stages[stage].completedAt = new Date().toISOString();
  workflow.updatedAt = new Date().toISOString();
  return workflow;
}
