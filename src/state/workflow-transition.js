const MODES = new Set(['deep-interview', 'ralplan', 'ralph']);
const AUTO_COMPLETE = new Set(['deep-interview->ralplan', 'ralplan->ralph']);

export function isMode(mode) {
  return MODES.has(mode);
}

export function evaluateTransition(activeModes, requestedMode) {
  const active = [...new Set(activeModes.filter(isMode))];
  if (!isMode(requestedMode)) throw new Error(`Unknown mode: ${requestedMode}`);
  const autoComplete = active.filter((mode) => AUTO_COMPLETE.has(`${mode}->${requestedMode}`));
  const blocked = active.some((mode) => mode === 'ralph' && requestedMode !== 'ralph');
  return {
    allowed: !blocked,
    requestedMode,
    currentModes: active,
    autoCompleteModes: autoComplete,
    resultingModes: blocked ? active : [...active.filter((mode) => !autoComplete.includes(mode)), requestedMode],
    transitionMessage: autoComplete.length ? `mode transiting: ${autoComplete.at(-1)} -> ${requestedMode}` : undefined,
    denialReason: blocked ? 'rollback' : undefined,
  };
}
