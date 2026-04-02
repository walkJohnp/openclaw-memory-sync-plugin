/**
 * File Watcher
 * Watches memory directory and auto-syncs on changes
 */

import * as chokidar from 'chokidar';
import { SyncEngine } from './sync';
import { ConfigManager } from './config';
import { logger } from './utils/logger';

const WATCH_DEBOUNCE = 5000; // 5 seconds debounce

let syncTimeout: NodeJS.Timeout | null = null;

export async function startWatcher(): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.load();
  
  const syncEngine = new SyncEngine(config, configManager);
  
  const memoryDir = config.source.workspace + '/memory';
  
  logger.info(`Starting file watcher on: ${memoryDir}`);
  
  const watcher = chokidar.watch([
    config.source.workspace + '/MEMORY.md',
    memoryDir + '/*.md',
  ], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });
  
  watcher
    .on('add', (path) => handleChange(path, syncEngine))
    .on('change', (path) => handleChange(path, syncEngine))
    .on('unlink', (path) => logger.info(`File removed: ${path}`))
    .on('error', (error) => logger.error('Watcher error:', error))
    .on('ready', () => logger.info('Watcher ready'));
}

function handleChange(path: string, syncEngine: SyncEngine): void {
  logger.info(`File changed: ${path}`);
  
  // Debounce sync
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(async () => {
    try {
      logger.info('Auto-syncing changes...');
      const result = await syncEngine.sync();
      
      if (result.success) {
        logger.info(`Auto-sync complete: ${result.uploaded} uploaded`);
      } else {
        logger.error('Auto-sync failed:', result.errors);
      }
    } catch (error) {
      logger.error('Auto-sync error:', error);
    }
  }, WATCH_DEBOUNCE);
}

// Start if run directly
if (require.main === module) {
  startWatcher().catch((error) => {
    logger.error('Failed to start watcher:', error);
    process.exit(1);
  });
}
