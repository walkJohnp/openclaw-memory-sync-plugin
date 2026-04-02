/**
 * Test script for memory sync plugin
 */

import { SyncEngine, ConfigManager } from './src';

async function main() {
  console.log('🧠 Testing Memory Sync Plugin\n');

  // Create config manager with test config
  const configManager = new ConfigManager();
  
  // Load or create config
  let config = await configManager.load();
  
  // Update service URL for testing
  config.service.serverUrl = 'http://localhost:8082';
  config.service.apiKey = '';
  config.source.workspace = '/root/.openclaw/workspace/pm';
  config.source.include = ['MEMORY.md', 'AGENTS.md'];
  
  console.log('Configuration:');
  console.log(`  Workspace: ${config.source.workspace}`);
  console.log(`  Server: ${config.service.serverUrl}`);
  console.log(`  Include: ${config.source.include.join(', ')}`);
  console.log();

  // Create sync engine
  const engine = new SyncEngine(config, configManager);

  // Check status first
  console.log('Checking service status...');
  const status = await engine.getStatus();
  console.log(`  Service: ${status.serviceStatus}`);
  console.log(`  Last sync: ${status.lastSync || 'Never'}`);
  console.log(`  Local files tracked: ${status.fileCount}`);
  console.log();

  if (status.serviceStatus !== 'connected') {
    console.log('❌ Service not connected, cannot proceed with sync');
    return;
  }

  // Perform sync
  console.log('Starting sync...\n');
  const result = await engine.sync();

  // Show results
  console.log('\n📊 Sync Results:');
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Uploaded: ${result.uploaded}`);
  console.log(`  Deleted: ${result.deleted}`);
  console.log(`  Duration: ${result.duration}ms`);

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error.path}: ${error.message}`);
    }
  }

  console.log('\n✨ Test completed!');
}

main().catch(console.error);
