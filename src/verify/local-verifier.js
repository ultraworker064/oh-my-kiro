import path from 'node:path';
import { STAGES } from '../config/defaults.js';
import { appendJsonLine, pathExists, readText, writeText } from '../state/store.js';
import { artifactPath, loadWorkflow } from '../workflow/artifacts.js';

export function verifyWorkflowArtifacts(root, workflowId, { includeVerify = true } = {}) {
  const workflow = loadWorkflow(root, workflowId);
  const failures = [];
  const stages = includeVerify ? STAGES : STAGES.filter((stage) => stage !== 'verify');
  for (const stage of stages) {
    const artifact = artifactPath(root, workflowId, stage);
    if (!pathExists(artifact)) failures.push(`Missing artifact: ${artifact}`);
    if (workflow.stages[stage]?.status !== 'completed') failures.push(`Stage not completed: ${stage}`);
    if (!workflow.stages[stage]?.evidencePath || !pathExists(workflow.stages[stage].evidencePath)) failures.push(`Missing evidence for stage: ${stage}`);
  }
  return { ok: failures.length === 0, failures };
}

export function finalizeVerificationArtifact(root, workflowId, { kiroArtifactPath }) {
  const workflow = loadWorkflow(root, workflowId);
  const workflowDir = path.dirname(artifactPath(root, workflowId, 'verify'));
  const commandsPath = path.join(workflowDir, 'evidence', 'commands.jsonl');
  const checks = [];
  for (const stage of ['clarify', 'plan', 'execute', 'verify']) {
    const file = artifactPath(root, workflowId, stage);
    const ok = pathExists(file);
    const check = {
      kind: 'artifact-exists',
      command: `node:fs.existsSync(${file})`,
      stage,
      ok,
      artifactPath: file,
      timestamp: new Date().toISOString(),
    };
    appendJsonLine(commandsPath, check);
    checks.push(check);
  }
  const prior = verifyWorkflowArtifacts(root, workflowId, { includeVerify: false });
  for (const failure of prior.failures) {
    checks.push({ kind: 'state-consistency', ok: false, failure, timestamp: new Date().toISOString() });
  }
  const verifyExists = pathExists(kiroArtifactPath);
  const failures = [...prior.failures];
  if (!verifyExists) failures.push(`Missing verify artifact: ${kiroArtifactPath}`);
  const verdict = failures.length === 0 ? 'PASS' : 'FAIL';
  const kiroOutput = verifyExists ? readText(kiroArtifactPath) : '';
  const evidenceList = [
    `- Workflow state: ${path.join(workflowDir, 'workflow.json')}`,
    `- Commands/evidence log: ${commandsPath}`,
    ...STAGES.map((stage) => `- ${stage} evidence: ${workflow.stages[stage]?.evidencePath ?? path.join(workflowDir, 'evidence', `${stage}.json`)}`),
  ].join('\n');
  const checkList = checks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'} ${check.kind}${check.stage ? ` (${check.stage})` : ''}${check.failure ? `: ${check.failure}` : ''}`).join('\n');
  const content = `# verify\n\nVerdict: ${verdict}\n\n## Local verification checks\n\n${checkList}\n\n## Evidence paths\n\n${evidenceList}\n\n## Kiro verification output\n\n${kiroOutput.trim() || '_No Kiro verification output captured._'}\n`;
  writeText(kiroArtifactPath, content);
  return { verdict, ok: verdict === 'PASS', failures, commandsPath };
}
