/**
 * Test scheduler - runs for 3 minutes to demonstrate periodic sync
 */

import { Scheduler } from './src/scheduler';
import { ConfigManager } from './src/config';

async function main() {
  console.log('🧠 Testing Memory Sync Scheduler\n');
  console.log('Will check for changes every 1 minute');
  console.log('Press Ctrl+C to stop\n');

  // Update config first
  const configManager = new ConfigManager();
  const config = await configManager.load();
  config.source.workspace = '/root/.openclaw/workspace/pm';
  config.service.serverUrl = 'http://localhost:8082';
  await configManager.save(config);

  const scheduler = new Scheduler();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    scheduler.stop();
    process.exit(0);
  });

  await scheduler.start();
  
  // Keep running for 3 minutes
  console.log('\nScheduler will run for 3 minutes...\n');
  await new Promise(resolve => setTimeout(resolve, 180000));
  
  console.log('\nStopping scheduler...');
  scheduler.stop();
  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
