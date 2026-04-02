/**
 * SyncEngine tests
 * Plugin → Sync Service architecture
 */

import { SyncEngine } from '../src/sync';
import { MemoryScanner } from '../src/scanner';
import { ConfigManager } from '../src/config';
import { PluginConfig, MemoryFile } from '../src/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { createTempDir, cleanupTempDir, createMockFile } from './test-utils';

// Mock the service client
jest.mock('../src/service-client', () => {
  return {
    SyncServiceClient: jest.fn().mockImplementation(() => ({
      health: jest.fn().mockResolvedValue({ status: 'healthy', version: '1.0.0' }),
      listFiles: jest.fn().mockResolvedValue([]),
      uploadFiles: jest.fn().mockResolvedValue([
        { fileId: 'file-1', url: 'http://test/file-1', syncedAt: new Date().toISOString() }
      ]),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('SyncEngine', () => {
  let tempDir: string;
  let config: PluginConfig;
  let engine: SyncEngine;

  beforeEach(async () => {
    tempDir = await createTempDir();
    config = {
      source: {
        workspace: tempDir,
        include: ['*.md'],
        exclude: [],
      },
      service: {
        serverUrl: 'http://localhost:8080',
        apiKey: 'test-key',
        timeout: 30000,
      },
      strategy: {
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
        logLevel: 'error',
      },
    };
    engine = new SyncEngine(config);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('buildSyncPlan', () => {
    it('should plan uploads for new files', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Memory');
      const scanner = new MemoryScanner(config);
      const localFiles = await scanner.scan();

      const plan = (engine as any).buildSyncPlan(localFiles, [], { files: [] });

      expect(plan.uploads).toHaveLength(1);
      expect(plan.uploads[0].path).toBe('MEMORY.md');
    });

    it('should not plan upload for unchanged files', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Memory');
      const scanner = new MemoryScanner(config);
      const localFiles = await scanner.scan();

      // Simulate remote file exists with same hash
      const remoteFiles = [{
        path: 'MEMORY.md',
        fileId: 'file-1',
        hash: localFiles[0].hash,
      }];

      const state = {
        files: [{
          path: 'MEMORY.md',
          hash: localFiles[0].hash,
          syncedAt: new Date(),
        }],
      };

      const plan = (engine as any).buildSyncPlan(localFiles, remoteFiles, state);

      expect(plan.uploads).toHaveLength(0);
    });

    it('should plan upload for modified files', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Memory v1');
      const scanner = new MemoryScanner(config);
      const localFiles = await scanner.scan();

      // Simulate different previous hash
      const state = {
        files: [{
          path: 'MEMORY.md',
          hash: 'different_hash',
          syncedAt: new Date(),
        }],
      };

      const plan = (engine as any).buildSyncPlan(localFiles, [], state);

      expect(plan.uploads).toHaveLength(1);
    });

    it('should plan deletions when deleteRemote is true', async () => {
      config.strategy.deleteRemote = true;
      engine = new SyncEngine(config);

      // No local files, but remote has one
      const remoteFiles = [{
        path: 'OLD.md',
        fileId: 'file-old',
        hash: 'hash-old',
      }];

      const plan = (engine as any).buildSyncPlan([], remoteFiles, { files: [] });

      expect(plan.deletions).toHaveLength(1);
      expect(plan.deletions[0]).toBe('file-old');
    });
  });

  describe('sync', () => {
    it('should complete successful sync', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Memory');

      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBeGreaterThanOrEqual(0);
    });

    it('should fail when service is unavailable', async () => {
      // Create new engine with mocked unavailable service
      const { SyncServiceClient } = require('../src/service-client');
      const originalImplementation = SyncServiceClient.getMockImplementation();
      
      SyncServiceClient.mockImplementationOnce(() => ({
        health: jest.fn().mockResolvedValue(null),
        listFiles: jest.fn().mockResolvedValue([]),
      }));

      const freshEngine = new SyncEngine(config);
      const result = await freshEngine.sync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    it('should return null lastSync when no previous sync', async () => {
      const freshTempDir = await createTempDir();
      const freshStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-fresh-'));
      const freshConfig: PluginConfig = {
        ...config,
        source: { ...config.source, workspace: freshTempDir },
      };
      
      const freshConfigManager = new ConfigManager(
        path.join(freshTempDir, 'config'),
        freshStateDir
      );
      const freshEngine = new SyncEngine(freshConfig, freshConfigManager);
      
      const status = await freshEngine.getStatus();

      expect(status.lastSync).toBeNull();
      expect(status.fileCount).toBe(0);
      expect(status.serviceStatus).toBe('connected');
      
      await cleanupTempDir(freshTempDir);
      await fs.rm(freshStateDir, { recursive: true, force: true });
    });
  });
});
