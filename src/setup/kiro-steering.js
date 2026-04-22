import path from 'node:path';
import { pathExists, writeText } from '../state/store.js';

const MANAGED = '<!-- omk:managed -->';

export function setupSteering(root, { force = false } = {}) {
  const files = {
    '.kiro/steering/omk-product.md': `${MANAGED}\n# oh-my-kiro Product Context\n\nOMK provides Kiro-backed versions of the main OMX workflow: deep-interview -> ralplan -> ralph.\n`,
    '.kiro/steering/omk-tech.md': `${MANAGED}\n# oh-my-kiro Technical Constraints\n\nKiro CLI is the model/chat frontend. omk owns tmux, local .omk state, mode artifacts, and session lifecycle. Do not rely on MCP or internet during workflow operation.\n`,
    '.kiro/steering/omk-structure.md': `${MANAGED}\n# oh-my-kiro Structure\n\nRuntime artifacts live under .omk/. Mode source lives under src/modes/ with state/session helpers under src/state/.\n`,
    '.kiro/agents/omk-deep-interview.json': JSON.stringify({ name: 'omk-deep-interview', description: 'Clarifies task intent, constraints, non-goals, and acceptance criteria for omk workflows' }, null, 2),
    '.kiro/agents/omk-ralplan.json': JSON.stringify({ name: 'omk-ralplan', description: 'Produces consensus-style PRD and test-spec artifacts for omk workflows' }, null, 2),
    '.kiro/agents/omk-ralph.json': JSON.stringify({ name: 'omk-ralph', description: 'Executes approved plans persistently with progress and verification artifacts' }, null, 2),
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
