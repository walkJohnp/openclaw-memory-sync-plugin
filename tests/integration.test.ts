/**
 * Real Integration Test - No Mocks
 * Tests the complete flow: scan -> detect changes -> sync -> verify
 * 
 * Prerequisites:
 * - Sync service running on http://localhost:8082
 * - SQLite database (will be cleared during test)
 * 
 * Run: npm run test:integration
 */

import { SyncEngine, ConfigManager, MemoryScanner } from '../src';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_WORKSPACE = '/root/.openclaw/workspace/pm';
const SERVICE_URL = 'http://localhost:8082';

describe('Integration Tests', () => {
  let configManager: ConfigManager;
  let config: any;

  beforeAll(async () => {
    // Check service health
    const response = await fetch(`${SERVICE_URL}/health`);
    if (!response.ok) {
      throw new Error('Sync service not available at ' + SERVICE_URL);
    }

    // Setup config
    configManager = new ConfigManager();
    config = await configManager.load();
    config.source.workspace = TEST_WORKSPACE;
    config.service.serverUrl = SERVICE_URL;
    config.source.include = ['MEMORY.md', 'AGENTS.md', 'SOUL.md'];
    await configManager.save(config);
  });

  beforeEach(async () => {
    // Clear sync state before each test
    await configManager.saveState({ lastSyncAt: null, files: [] });
  });

  describe('Service Health', () => {
    it('should connect to sync service', async () => {
      const response = await fetch(`${SERVICE_URL}/health`);
      expect(response.ok).toBe(true);
      const data = await response.json() as { status: string };
      expect(data.status).toBe('ok');
    });
  });

  describe('File Scanning', () => {
    it('should scan memory files', async () => {
      const scanner = new MemoryScanner(config);
      const files = await scanner.scan();
      
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path === 'MEMORY.md')).toBe(true);
      expect(files.some(f => f.path === 'AGENTS.md')).toBe(true);
      expect(files.some(f => f.path === 'SOUL.md')).toBe(true);
    });

    it('should calculate file hashes', async () => {
      const scanner = new MemoryScanner(config);
      const files = await scanner.scan();
      
      for (const file of files) {
        expect(file.hash).toBeDefined();
        expect(file.hash.length).toBe(64); // SHA256 hex
      }
    });
  });

  describe('Sync Flow', () => {
    it('should upload all files on first sync', async () => {
      const engine = new SyncEngine(config, configManager);
      const result = await engine.sync();
      
      expect(result.success).toBe(true);
      expect(result.uploaded).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip unchanged files on second sync', async () => {
      // First sync
      const engine1 = new SyncEngine(config, configManager);
      await engine1.sync();

      // Second sync (no changes)
      const engine2 = new SyncEngine(config, configManager);
      const result = await engine2.sync();
      
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
    });

    it('should detect and upload modified files', async () => {
      // First sync
      const engine1 = new SyncEngine(config, configManager);
      await engine1.sync();

      // Modify a file
      const memoryPath = path.join(TEST_WORKSPACE, 'MEMORY.md');
      const originalContent = await fs.readFile(memoryPath, 'utf-8');
      const modifiedContent = originalContent + '\n\n<!-- Test modification -->';
      await fs.writeFile(memoryPath, modifiedContent, 'utf-8');

      try {
        // Sync after modification
        const engine2 = new SyncEngine(config, configManager);
        const result = await engine2.sync();
        
        expect(result.success).toBe(true);
        expect(result.uploaded).toBe(1);
      } finally {
        // Restore original
        await fs.writeFile(memoryPath, originalContent, 'utf-8');
      }
    });
  });

  describe('Remote Verification', () => {
    it('should list uploaded files', async () => {
      // Sync first
      const engine = new SyncEngine(config, configManager);
      await engine.sync();

      // Verify remote
      const response = await fetch(`${SERVICE_URL}/api/v1/files`);
      expect(response.ok).toBe(true);
      
      const data = await response.json() as { files: any[]; count: number };
      expect(data.count).toBeGreaterThan(0);
      expect(data.files.length).toBeGreaterThan(0);
    });

    it('should have correct file metadata', async () => {
      // Sync first
      const engine = new SyncEngine(config, configManager);
      await engine.sync();

      // Verify remote
      const response = await fetch(`${SERVICE_URL}/api/v1/files`);
      const data = await response.json() as { files: any[] };
      
      for (const file of data.files) {
        expect(file.file_path).toBeDefined();
        expect(file.file_hash).toBeDefined();
        expect(file.file_size).toBeGreaterThan(0);
      }
    });
  });
});
