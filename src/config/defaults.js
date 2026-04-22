export const OMK_DIR = '.omk';
export const STAGES = ['clarify', 'plan', 'execute', 'verify'];
export const STAGE_TO_ARTIFACT = {
  clarify: 'clarify.md',
  plan: 'plan.md',
  execute: 'execute.md',
  verify: 'verify.md',
};
export const STAGE_TO_AGENT = {
  clarify: 'omk-clarifier',
  plan: 'omk-planner',
  execute: 'omk-executor',
  verify: 'omk-verifier',
};
export const DEFAULT_TIMEOUT_MS = 120_000;
export const KIRO_INSTALL_COMMAND = 'curl -fsSL https://cli.kiro.dev/install | bash';
