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
console.log(`# ${stage}\n\nFake Kiro response for ${stage}.\n\nPrompt length: ${prompt.length}\n\n## Evidence\n- workflow: ${process.env.OMK_WORKFLOW_ID || 'unknown'}\n`);
