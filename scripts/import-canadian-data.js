#!/usr/bin/env node

// Use tsx to run the TypeScript file directly
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('🚀 Starting Canadian Business Data Import Process');

// Get the current directory to build the correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build the path to the index.ts file relative to the project root
const indexPath = join(__dirname, '..', 'server', 'dataIngestion', 'index.ts');

// Spawn a new process with tsx to handle the TypeScript import
const child = spawn('npx', ['tsx', indexPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Canadian Business Data Import completed successfully!');
  } else {
    console.log('❌ Canadian Business Data Import completed with errors (check logs above)');
  }
  process.exit(code);
});

child.on('error', (err) => {
  console.error('❌ Failed to start import process:', err);
  process.exit(1);
});