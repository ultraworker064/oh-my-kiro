#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--help') || args[0] === '--help') {
  console.log('fake kiro-cli help');
  process.exit(0);
}
if (args[0] === 'chat' && args.includes('--help')) {
  console.log('fake kiro-cli chat help');
  process.exit(0);
}
if (args[0] !== 'chat') {
  console.error(`unsupported fake kiro command: ${args.join(' ')}`);
  process.exit(2);
}
const stage = process.env.OMK_STAGE || 'unknown';
if (process.env.FAKE_KIRO_FAIL_STAGE === stage) {
  console.error(`fake kiro failure for ${stage}`);
  process.exit(42);
}
const prompt = args.at(-1) || '';
let handoffText = prompt;
const readMatch = prompt.match(/Read\s+([^\s]+)\s+and follow/);
if (readMatch) {
  try {
    const fs = await import('node:fs');
    handoffText = fs.readFileSync(readMatch[1], 'utf8');
  } catch {}
}
const resultMatch = handoffText.match(/Result file:\s*([^\n]+)/) || handoffText.match(/write the final agreed result to:\s*([^\n]+)/i);
const doneMatch = handoffText.match(/Done sentinel:\s*([^\n]+)/) || handoffText.match(/create\/touch this done sentinel:\s*([^\n]+)/i);
if (process.env.FAKE_KIRO_INTERACTIVE_HANDOFF === '1' && resultMatch && doneMatch) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const resultPath = resultMatch[1].trim();
  const donePath = doneMatch[1].trim();
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, `# interactive result\n\nFinal clarified task from fake interactive Kiro.\n`);
  fs.mkdirSync(path.dirname(donePath), { recursive: true });
  fs.writeFileSync(donePath, 'done\n');
}
console.log(`# ${stage}\n\nFake Kiro response for ${stage}.\n\nPrompt length: ${prompt.length}\n\n## Evidence\n- workflow: ${process.env.OMK_WORKFLOW_ID || 'unknown'}\n`);
