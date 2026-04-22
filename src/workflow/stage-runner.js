import path from 'node:path';
import { STAGES } from '../config/defaults.js';
import { writeJson, readJson, pathExists, readText, writeText } from '../state/store.js';
import { buildPrompt, buildInteractiveHandoffPrompt } from '../prompts/templates.js';
import { runStageWrapper } from '../kiro/stage-wrapper.js';
import { runStageInTmux, recordSession, sessionName, showWorkflowSummaryInTmux, shouldAttachToTmux, launchInteractiveKiroInTmux } from '../tmux/tmux-manager.js';
import { artifactPath, assertCanWriteArtifact, createWorkflow, evidencePath, inferWorkflowIdFromArtifact, loadWorkflow, promptPath, saveWorkflow, stderrPath, stdoutPath, wrapperConfigPath, wrapperResultPath, writePrompt, interactivePromptPath, interactiveResultPath, interactiveDonePath } from './artifacts.js';
import { markStage } from './state-machine.js';
import { finalizeVerificationArtifact } from '../verify/local-verifier.js';

export function previousStage(stage) {
  const idx = STAGES.indexOf(stage);
  return idx > 0 ? STAGES[idx - 1] : null;
}

export function resolveWorkflowForStage(root, stage, input, options = {}) {
  if (stage === 'clarify') {
    if (options.workflowId) return loadWorkflow(root, options.workflowId);
    return createWorkflow(root, input, options.workflowId);
  }
  const workflowId = options.workflowId || inferWorkflowIdFromArtifact(input);
  return loadWorkflow(root, workflowId);
}

export function runStage(root, stage, input, options = {}) {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
  const workflow = resolveWorkflowForStage(root, stage, input, options);
  assertCanWriteArtifact(root, workflow.id, stage, { force: options.force });

  const prompt = buildPrompt(stage, input, { workflow });
  writePrompt(root, workflow.id, stage, prompt);
  markStage(workflow, stage, 'running', { promptPath: promptPath(root, workflow.id, stage) }, { force: options.force });
  saveWorkflow(root, workflow);

  const config = {
    root,
    workflowId: workflow.id,
    stage,
    prompt,
    kiroBin: options.kiroBin,
    trustTools: options.trustTools,
    artifactPath: artifactPath(root, workflow.id, stage),
    evidencePath: evidencePath(root, workflow.id, stage),
    stdoutPath: stdoutPath(root, workflow.id, stage),
    stderrPath: stderrPath(root, workflow.id, stage),
    resultPath: wrapperResultPath(root, workflow.id, stage),
    tmux: null,
  };
  const configPath = wrapperConfigPath(root, workflow.id, stage);
  writeJson(configPath, config);

  let evidence;
  try {
    if (options.noTmux) {
      config.tmux = { session: sessionName(root), window: stage, pane: `${sessionName(root)}:${stage}`, mode: 'direct' };
      writeJson(configPath, config);
      recordSession(root, { workflowId: workflow.id, stage, ...config.tmux, launchedAt: new Date().toISOString(), command: 'direct stage-wrapper' });
      evidence = runStageWrapper(configPath);
    } else {
      const launch = runStageInTmux({ root, workflowId: workflow.id, stage, configPath, resultPath: config.resultPath, tmuxBin: options.tmuxBin, timeoutMs: options.timeoutMs });
      config.tmux = launch.metadata;
      const savedEvidence = readJson(config.resultPath, null);
      evidence = savedEvidence ?? runStageWrapper(configPath);
      if (evidence && !evidence.tmux) {
        evidence.tmux = launch.metadata;
        writeJson(config.evidencePath, evidence);
        writeJson(config.resultPath, evidence);
      }
    }
    if (evidence.exitCode !== 0) {
      markStage(workflow, stage, 'failed', { evidencePath: config.evidencePath, error: evidence.error || `Kiro exited ${evidence.exitCode}` });
      saveWorkflow(root, workflow);
      const error = new Error(`Stage ${stage} failed; see ${config.stderrPath}`);
      error.hint = `Recovery: omk workflow --workflow-id ${workflow.id} --resume`;
      error.exitCode = evidence.exitCode || 1;
      throw error;
    }
    if (stage === 'verify') {
      const local = finalizeVerificationArtifact(root, workflow.id, { kiroArtifactPath: config.artifactPath });
      if (!local.ok) {
        markStage(workflow, stage, 'failed', { artifactPath: config.artifactPath, evidencePath: config.evidencePath, error: local.failures.join('; ') });
        saveWorkflow(root, workflow);
        const error = new Error(`Stage verify failed local checks; see ${config.artifactPath}`);
        error.hint = `Recovery: omk workflow --workflow-id ${workflow.id} --resume`;
        error.exitCode = 1;
        throw error;
      }
    }
    markStage(workflow, stage, 'completed', { artifactPath: config.artifactPath, evidencePath: config.evidencePath, error: null });
    saveWorkflow(root, workflow);
    return { workflow, artifactPath: config.artifactPath, evidence };
  } catch (error) {
    if (!error.hint) error.hint = `Recovery: omk workflow --workflow-id ${workflow.id} --resume`;
    const current = loadWorkflow(root, workflow.id);
    if (current.stages[stage]?.status === 'running') {
      markStage(current, stage, 'failed', { error: error.message });
      saveWorkflow(root, current);
    }
    throw error;
  }
}

export function runWorkflow(root, task, options = {}) {
  let input = task;
  let workflow = options.workflowId ? loadWorkflow(root, options.workflowId) : null;
  const useInteractiveHandoff = !options.resume && !options.handoffFile && shouldAttachToTmux({ attach: options.attach, noAttach: options.noAttach, noTmux: options.noTmux });
  const startStage = options.resume && workflow ? firstPendingStage(workflow) : (useInteractiveHandoff || options.handoffFile ? 'plan' : 'clarify');
  let started = false;
  try {
    if (useInteractiveHandoff || options.handoffFile) {
      const handoff = prepareInteractiveHandoff(root, task, { ...options, workflow });
      workflow = handoff.workflow;
      input = handoff.clarifyArtifact;
    }
    for (const stage of STAGES) {
      if (stage === startStage) started = true;
      if (!started) continue;
      if (stage !== 'clarify') input = artifactPath(root, workflow.id, previousStage(stage));
      const result = runStage(root, stage, input, { ...options, workflowId: workflow?.id ?? options.workflowId });
      workflow = result.workflow;
      input = result.artifactPath;
    }
    showWorkflowSummaryInTmux({ root, workflow, tmuxBin: options.tmuxBin, attach: options.attach, noAttach: options.noAttach, noTmux: options.noTmux });
    return { workflow, workflowDir: path.dirname(artifactPath(root, workflow.id, 'clarify')) };
  } catch (error) {
    const recoveryId = workflow?.id ?? parseWorkflowIdFromHint(error.hint);
    if (recoveryId) {
      const failedWorkflow = loadWorkflow(root, recoveryId);
      const failedStage = Object.entries(failedWorkflow.stages || {}).find(([, state]) => state.status === 'failed')?.[0];
      const recoveryCommand = `omk workflow --workflow-id ${recoveryId} --resume`;
      try {
        showWorkflowSummaryInTmux({ root, workflow: failedWorkflow, tmuxBin: options.tmuxBin, attach: options.attach, noAttach: options.noAttach, noTmux: options.noTmux, failedStage, recoveryCommand });
      } catch {
        // Preserve original workflow error if summary display fails.
      }
    }
    throw error;
  }
}

export function prepareInteractiveHandoff(root, task, options = {}) {
  const workflow = options.workflow ?? createWorkflow(root, task, options.workflowId);
  const resultPath = options.handoffFile ? path.resolve(root, options.handoffFile) : interactiveResultPath(root, workflow.id);
  const donePath = interactiveDonePath(root, workflow.id);
  const promptFile = interactivePromptPath(root, workflow.id);
  const prompt = buildInteractiveHandoffPrompt({ task, resultPath, donePath });
  writeText(promptFile, prompt);
  if (!options.handoffFile) {
    launchInteractiveKiroInTmux({ root, workflow, task, promptPath: promptFile, resultPath, donePath, kiroBin: options.kiroBin, tmuxBin: options.tmuxBin, attach: options.attach, noAttach: options.noAttach, noTmux: options.noTmux });
    waitForHandoff(resultPath, donePath, options.interactiveHandoffTimeoutMs ?? options.timeoutMs ?? 120000, workflow.id);
  } else if (!pathExists(resultPath)) {
    const error = new Error(`Handoff file not found: ${resultPath}`);
    error.hint = `Recovery: create ${resultPath}, then run omk workflow --workflow-id ${workflow.id} --resume`;
    error.exitCode = 1;
    throw error;
  }
  const clarifyArtifact = artifactPath(root, workflow.id, 'clarify');
  writeText(clarifyArtifact, readText(resultPath));
  markStage(workflow, 'clarify', 'running', { promptPath: promptFile }, { force: true });
  markStage(workflow, 'clarify', 'completed', { artifactPath: clarifyArtifact, evidencePath: resultPath, error: null });
  saveWorkflow(root, workflow);
  return { workflow, clarifyArtifact, resultPath, donePath, promptFile };
}

function waitForHandoff(resultPath, donePath, timeoutMs, workflowId) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pathExists(resultPath) && pathExists(donePath)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  const error = new Error(`Timed out waiting for interactive Kiro handoff: ${resultPath}`);
  error.hint = `Recovery: create ${resultPath} and ${donePath}, then run omk workflow --workflow-id ${workflowId} --resume`;
  error.exitCode = 1;
  throw error;
}

function firstPendingStage(workflow) {
  for (const stage of STAGES) {
    if (workflow.stages[stage]?.status !== 'completed') return stage;
  }
  return 'verify';
}

function parseWorkflowIdFromHint(hint) {
  return String(hint || '').match(/--workflow-id\s+([^\s]+)/)?.[1] ?? null;
}
