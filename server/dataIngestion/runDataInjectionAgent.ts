#!/usr/bin/env node

// ES module compatible approach for checking if running directly
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DataInjectionAgent } from './dataInjectionAgent.js';

// Configuration for the data injection agent
const agentConfig = {
  pollingInterval: 60, // Check for updates every hour
  batchSize: 1000,
  retryAttempts: 3,
  retryDelay: 30, // 30 seconds
  maxConcurrentSources: 2
};

async function main() {
  console.log('🚀 Initializing Canadian Data Injection Agent...');
  
  const agent = new DataInjectionAgent(agentConfig);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
    await agent.stop();
    console.log('✅ Agent shutdown complete');
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
    await agent.stop();
    console.log('✅ Agent shutdown complete');
    process.exit(0);
  });
  
  // Start the agent
  await agent.start();
  
  console.log('\n🤖 Data Injection Agent is now running...');
  console.log('Press Ctrl+C to stop the agent');
  
  // Keep the process running
  await new Promise(() => {});
}

// Check if running directly using ES module approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = process.argv[1];

// Compare the current script path with the executed script path
const isRunningDirectly = scriptPath && __filename.includes(scriptPath);

if (isRunningDirectly) {
  main().catch(error => {
    console.error('💥 Fatal error in Data Injection Agent:', error);
    process.exit(1);
  });
}

export { DataInjectionAgent };