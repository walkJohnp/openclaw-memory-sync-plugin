/**
 * ConfigManager tests
 */

import { ConfigManager } from '../src/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let tempConfigDir: string;
  let tempStateDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    // Create temp directories
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-'));
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-'));
    
    // Create config manager with temp directories
    configManager = new ConfigManager(tempConfigDir, tempStateDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempConfigDir, { recursive: true, force: true });
    await fs.rm(tempStateDir, { recursive: true, force: true });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = configManager.getDefaultConfig();

      expect(config).toBeDefined();
      expect(config.source.workspace).toContain('.openclaw/workspace/pm');
      expect(config.source.include).toContain('MEMORY.md');
      expect(config.service.serverUrl).toBe('http://localhost:8080');
      expect(config.strategy.syncMode).toBe('incremental');
    });
  });

  describe('save and load', () => {
    it('should save and load configuration', async () => {
      const defaultConfig = configManager.getDefaultConfig();
      defaultConfig.service.serverUrl = 'http://test-server:8080';

      await configManager.save(defaultConfig);
      const loaded = await configManager.load();

      expect(loaded.service.serverUrl).toBe('http://test-server:8080');
    });

    it('should create config directory if not exists', async () => {
      const config = configManager.getDefaultConfig();
      await configManager.save(config);

      const configPath = path.join(tempConfigDir, 'memory-sync.yaml');
      const stat = await fs.stat(configPath);
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('state management', () => {
    it('should save and load state', async () => {
      const state = {
        lastSyncAt: new Date().toISOString(),
        files: [
          { path: 'MEMORY.md', hash: 'abc123', syncedAt: new Date() },
        ],
      };

      await configManager.saveState(state);
      const loaded = await configManager.loadState();

      expect(loaded.lastSyncAt).toBe(state.lastSyncAt);
      expect(loaded.files).toHaveLength(1);
      expect(loaded.files[0].path).toBe('MEMORY.md');
    });

    it('should return empty state when no state file exists', async () => {
      // Create fresh config manager with new temp dirs
      const freshConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-config-'));
      const freshStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-state-'));
      const freshManager = new ConfigManager(freshConfigDir, freshStateDir);
      
      const state = await freshManager.loadState();

      expect(state.lastSyncAt).toBeNull();
      expect(state.files).toHaveLength(0);
      
      // Cleanup
      await fs.rm(freshConfigDir, { recursive: true, force: true });
      await fs.rm(freshStateDir, { recursive: true, force: true });
    });
  });

  describe('exists', () => {
    it('should return false when config does not exist', async () => {
      // Create fresh config manager with new temp dir
      const freshConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-exists-'));
      const freshStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-state2-'));
      const freshManager = new ConfigManager(freshConfigDir, freshStateDir);
      
      const exists = await freshManager.exists();
      expect(exists).toBe(false);
      
      // Cleanup
      await fs.rm(freshConfigDir, { recursive: true, force: true });
      await fs.rm(freshStateDir, { recursive: true, force: true });
    });

    it('should return true when config exists', async () => {
      await configManager.save(configManager.getDefaultConfig());
      const exists = await configManager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('init', () => {
    it('should create default config if not exists', async () => {
      await configManager.init();
      const exists = await configManager.exists();
      expect(exists).toBe(true);
    });

    it('should not overwrite existing config', async () => {
      const config = configManager.getDefaultConfig();
      config.service.serverUrl = 'http://custom-server:8080';
      await configManager.save(config);

      await configManager.init();
      const loaded = await configManager.load();

      expect(loaded.service.serverUrl).toBe('http://custom-server:8080');
    });
  });
});
