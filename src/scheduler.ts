/**
 * Scheduler
 * Periodic sync scheduler - checks for file changes every minute
 */

import { SyncEngine } from './sync';
import { ConfigManager } from './config';
import { MemoryScanner } from './scanner';
import { logger } from './utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const CHECK_INTERVAL = 60000; // 1 minute

interface FileState {
  path: string;
  hash: string;
  mtime: number;
}

export class Scheduler {
  private configManager: ConfigManager;
  private syncEngine!: SyncEngine;
  private scanner!: MemoryScanner;
  private intervalId: NodeJS.Timeout | null = null;
  private lastKnownState: Map<string, FileState> = new Map();
  private isRunning = false;

  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * Initialize scheduler
   */
  async init(): Promise<void> {
    const config = await this.configManager.load();
    this.syncEngine = new SyncEngine(config, this.configManager);
    this.scanner = new MemoryScanner(config);
    
    // Load last known state
    await this.loadState();
    
    logger.info('Scheduler initialized');
    logger.info(`Check interval: ${CHECK_INTERVAL / 1000}s`);
  }

  /**
   * Start periodic sync
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    await this.init();
    this.isRunning = true;

    logger.info('Starting scheduler...');
    
    // Run first check immediately
    await this.checkAndSync();

    // Schedule periodic checks
    this.intervalId = setInterval(async () => {
      await this.checkAndSync();
    }, CHECK_INTERVAL);

    logger.info('Scheduler started');
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Check for changes and sync if needed
   */
  private async checkAndSync(): Promise<void> {
    const timestamp = new Date().toISOString();
    logger.info(`[${timestamp}] Checking for file changes...`);

    try {
      // Scan current files
      const currentFiles = await this.scanner.scan();
      const currentState = new Map<string, FileState>();

      for (const file of currentFiles) {
        currentState.set(file.path, {
          path: file.path,
          hash: file.hash,
          mtime: file.modifiedAt.getTime(),
        });
      }

      // Detect changes
      const changes = this.detectChanges(currentState);

      if (changes.hasChanges) {
        logger.info(`Changes detected: ${changes.newFiles.length} new, ${changes.modifiedFiles.length} modified, ${changes.deletedFiles.length} deleted`);
        
        // Perform sync
        logger.info('Starting sync...');
        const result = await this.syncEngine.sync();
        
        if (result.success) {
          logger.info(`Sync completed: ${result.uploaded} uploaded, ${result.deleted} deleted`);
          // Update last known state after successful sync
          this.lastKnownState = currentState;
          await this.saveState();
        } else {
          logger.error('Sync failed:', result.errors.map(e => e.message).join(', '));
        }
      } else {
        logger.debug('No changes detected');
      }
    } catch (error) {
      logger.error('Check failed:', error);
    }
  }

  /**
   * Detect changes between last known and current state
   */
  private detectChanges(currentState: Map<string, FileState>): {
    hasChanges: boolean;
    newFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
  } {
    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    // Check for new and modified files
    for (const [path, state] of currentState) {
      const lastState = this.lastKnownState.get(path);
      
      if (!lastState) {
        newFiles.push(path);
      } else if (lastState.hash !== state.hash) {
        modifiedFiles.push(path);
      }
    }

    // Check for deleted files
    for (const path of this.lastKnownState.keys()) {
      if (!currentState.has(path)) {
        deletedFiles.push(path);
      }
    }

    return {
      hasChanges: newFiles.length > 0 || modifiedFiles.length > 0 || deletedFiles.length > 0,
      newFiles,
      modifiedFiles,
      deletedFiles,
    };
  }

  /**
   * Load last known state from file
   */
  private async loadState(): Promise<void> {
    try {
      const stateDir = path.join(process.env.HOME || '', '.openclaw', 'state');
      const stateFile = path.join(stateDir, 'scheduler-state.json');
      
      const content = await fs.readFile(stateFile, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.files) {
        for (const file of data.files) {
          this.lastKnownState.set(file.path, file);
        }
      }
      
      logger.debug(`Loaded state: ${this.lastKnownState.size} files`);
    } catch (error) {
      // State file doesn't exist yet
      logger.debug('No previous state found');
    }
  }

  /**
   * Save current state to file
   */
  private async saveState(): Promise<void> {
    try {
      const stateDir = path.join(process.env.HOME || '', '.openclaw', 'state');
      await fs.mkdir(stateDir, { recursive: true });
      
      const stateFile = path.join(stateDir, 'scheduler-state.json');
      const data = {
        lastCheck: new Date().toISOString(),
        files: Array.from(this.lastKnownState.values()),
      };
      
      await fs.writeFile(stateFile, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug('State saved');
    } catch (error) {
      logger.error('Failed to save state:', error);
    }
  }
}

// CLI entry point
async function main() {
  const scheduler = new Scheduler();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    scheduler.stop();
    process.exit(0);
  });

  await scheduler.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Scheduler failed:', error);
    process.exit(1);
  });
}

export default Scheduler;
