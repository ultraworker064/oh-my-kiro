import path from 'node:path';
import { pathExists, writeText } from '../state/store.js';

const MANAGED = '<!-- omk:managed -->';

export function setupSteering(root, { force = false } = {}) {
  const files = {
    '.kiro/steering/omk-product.md': `${MANAGED}\n# oh-my-kiro Product Context\n\nMilestone 1 provides a local sidecar workflow around Kiro CLI: clarify -> plan -> execute -> verify.\n`,
    '.kiro/steering/omk-tech.md': `${MANAGED}\n# oh-my-kiro Technical Constraints\n\nKiro CLI is the model/chat frontend. omk owns tmux, local .omk state, artifacts, and evidence. Do not rely on MCP or internet during workflow operation.\n`,
    '.kiro/steering/omk-structure.md': `${MANAGED}\n# oh-my-kiro Structure\n\nRuntime artifacts live under .omk/. M1 source is a dependency-light Node.js CLI under bin/ and src/.\n`,
    '.kiro/agents/omk-clarifier.json': JSON.stringify({ name: 'omk-clarifier', description: 'Clarifies task intent, constraints, non-goals, and acceptance criteria for oh-my-kiro workflows' }, null, 2),
    '.kiro/agents/omk-planner.json': JSON.stringify({ name: 'omk-planner', description: 'Produces concrete implementation plans for oh-my-kiro workflows' }, null, 2),
    '.kiro/agents/omk-executor.json': JSON.stringify({ name: 'omk-executor', description: 'Executes approved oh-my-kiro plans within M1 scope' }, null, 2),
    '.kiro/agents/omk-verifier.json': JSON.stringify({ name: 'omk-verifier', description: 'Verifies oh-my-kiro execution artifacts and reports PASS or FAIL' }, null, 2),
  };
  const written = [];
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    if (pathExists(file) && !force) continue;
    writeText(file, `${content}\n`);
    written.push(relative);
  }
  return written;
}
