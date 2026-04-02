/**
 * Sync Command
 * CLI entry point for memory sync
 */

import { ConfigManager } from '../config';
import { SyncEngine } from '../sync';
import { logger } from '../utils/logger';

async function main() {
  try {
    // Load configuration
    const configManager = new ConfigManager();
    await configManager.init();
    const config = await configManager.load();

    // Set log level
    logger.setLevel(config.advanced.logLevel);

    console.log('🧠 OpenClaw Memory Sync\n');

    // Show config summary
    console.log('Configuration:');
    console.log(`  Workspace: ${config.source.workspace}`);
    console.log(`  Target: ${config.target.docName}`);
    console.log(`  Mode: ${config.strategy.syncMode}`);
    console.log(`  Conflict: ${config.strategy.conflictResolution}`);
    console.log();

    // Perform sync
    const engine = new SyncEngine(config);
    const result = await engine.sync();

    // Show results
    console.log('\n📊 Sync Results:');
    console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`  Uploaded: ${result.uploaded}`);
    console.log(`  Downloaded: ${result.downloaded}`);
    console.log(`  Conflicts: ${result.conflicts}`);
    console.log(`  Deleted: ${result.deleted}`);
    console.log(`  Duration: ${result.duration}ms`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error.path}: ${error.message}`);
      }
      process.exit(1);
    }

    console.log('\n✨ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
