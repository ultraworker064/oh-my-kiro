#!/usr/bin/env node
import { runCli } from '../src/cli/commands.js';

runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`Error: ${message}`);
  if (error?.hint) console.error(`Hint: ${error.hint}`);
  process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
});
