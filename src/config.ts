/**
 * Configuration management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SyncConfig } from './types';
import { logger } from './utils/logger';

export class ConfigManager {
  private config: SyncConfig | null = null;
  private configDir: string;
  private stateDir: string;

  constructor(configDir?: string, stateDir?: string) {
    this.configDir = configDir || path.join(process.env.HOME || '', '.openclaw', 'config');
    this.stateDir = stateDir || path.join(process.env.HOME || '', '.openclaw', 'state');
  }

  private get configFile(): string {
    return path.join(this.configDir, 'memory-sync.yaml');
  }

  private get stateFile(): string {
    return path.join(this.stateDir, 'memory-sync.json');
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<SyncConfig> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      
      const content = await fs.readFile(this.configFile, 'utf-8');
      const parsed = yaml.parse(content);
      this.config = this.validateConfig(parsed.memory_sync);
      logger.debug('Configuration loaded');
      return this.config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('Config file not found, using defaults');
        return this.getDefaultConfig();
      }
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: SyncConfig): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
    const content = yaml.stringify({ memory_sync: config });
    await fs.writeFile(this.configFile, content, 'utf-8');
    this.config = config;
    logger.info('Configuration saved');
  }

  /**
   * Load sync state
   */
  async loadState(): Promise<{ lastSyncAt: string | null; files: any[] }> {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
      const content = await fs.readFile(this.stateFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { lastSyncAt: null, files: [] };
      }
      throw error;
    }
  }

  /**
   * Save sync state
   */
  async saveState(state: { lastSyncAt: string | null; files: any[] }): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    logger.debug('State saved');
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): SyncConfig {
    const workspace = path.join(process.env.HOME || '', '.openclaw', 'workspace', 'pm');
    
    return {
      source: {
        workspace,
        include: [
          'MEMORY.md',
          'memory/*.md',
          'AGENTS.md',
          'SOUL.md',
          'USER.md',
          'HEARTBEAT.md',
          'TOOLS.md',
          'IDENTITY.md',
        ],
        exclude: [
          '*.secret.md',
          '*.local.md',
          'node_modules/**',
          '.*/**',
        ],
      },
      target: {
        folderToken: '',
        docName: 'OpenClaw记忆中心',
        categorize: true,
      },
      strategy: {
        conflictResolution: 'local_priority',
        syncMode: 'incremental',
        deleteRemote: false,
      },
      schedule: {
        enabled: false,
        interval: '1h',
      },
      advanced: {
        watch: false,
        compress: false,
        keepHistory: true,
        logLevel: 'info',
      },
    };
  }

  /**
   * Validate and normalize configuration
   */
  private validateConfig(config: any): SyncConfig {
    return {
      source: {
        workspace: config.source?.workspace || '',
        include: config.source?.include || [],
        exclude: config.exclude?.exclude || [],
      },
      target: {
        folderToken: config.target?.folderToken || '',
        docName: config.target?.docName || 'OpenClaw记忆中心',
        categorize: config.target?.categorize ?? true,
      },
      strategy: {
        conflictResolution: config.strategy?.conflictResolution || 'local_priority',
        syncMode: config.strategy?.syncMode || 'incremental',
        deleteRemote: config.strategy?.deleteRemote ?? false,
      },
      schedule: {
        enabled: config.schedule?.enabled ?? false,
        interval: config.schedule?.interval || '1h',
      },
      advanced: {
        watch: config.advanced?.watch ?? false,
        compress: config.advanced?.compress ?? false,
        keepHistory: config.advanced?.keepHistory ?? true,
        logLevel: config.advanced?.logLevel || 'info',
      },
    };
  }

  /**
   * Check if config exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize default config if not exists
   */
  async init(): Promise<void> {
    if (!(await this.exists())) {
      await this.save(this.getDefaultConfig());
      logger.info('Default configuration initialized');
    }
  }
}

export default ConfigManager;
