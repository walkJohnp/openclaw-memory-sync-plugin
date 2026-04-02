/**
 * SyncEngine tests
 */

import { SyncEngine } from '../src/sync';
import { MemoryScanner } from '../src/scanner';
import { ConfigManager } from '../src/config';
import { SyncConfig, MemoryFile } from '../src/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { createTempDir, cleanupTempDir, createMockFile } from './test-utils';

describe('SyncEngine', () => {
  let tempDir: string;
  let config: SyncConfig;
  let engine: SyncEngine;

  beforeEach(async () => {
    tempDir = await createTempDir();
    config = {
      source: {
        workspace: tempDir,
        include: ['*.md'],
        exclude: [],
      },
      target: {
        folderToken: '',
        docName: 'Test',
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

      // Access private method through any cast
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
        docId: 'doc1',
        modifiedAt: new Date(),
        content: localFiles[0].hash, // Remote has same hash
      }];

      // Simulate previous sync state with matching hash
      const state = {
        files: [{
          path: 'MEMORY.md',
          hash: localFiles[0].hash, // Same hash as current file
          syncedAt: new Date(),
        }],
      };

      const plan = (engine as any).buildSyncPlan(localFiles, remoteFiles, state);

      // File should not be in uploads since hash matches state and remote exists
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
  });

  describe('resolveConflict', () => {
    it('should resolve with upload for local_priority', async () => {
      const conflict = {
        file: { path: 'test.md' } as MemoryFile,
        remote: { path: 'test.md', docId: 'doc1', modifiedAt: new Date() },
        type: 'modified_both' as const,
      };

      const result = await (engine as any).resolveConflict(conflict);

      expect(result).toBe('upload');
    });

    it('should resolve with download for remote_priority', async () => {
      config.strategy.conflictResolution = 'remote_priority';
      engine = new SyncEngine(config);

      const conflict = {
        file: { path: 'test.md' } as MemoryFile,
        remote: { path: 'test.md', docId: 'doc1', modifiedAt: new Date() },
        type: 'modified_both' as const,
      };

      const result = await (engine as any).resolveConflict(conflict);

      expect(result).toBe('download');
    });
  });

  describe('getStatus', () => {
    it('should return null lastSync when no previous sync', async () => {
      // Create fresh temp dirs for this test
      const freshTempDir = await createTempDir();
      const freshStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-fresh-'));
      const freshConfig: SyncConfig = {
        ...config,
        source: { ...config.source, workspace: freshTempDir },
      };
      
      // Create fresh config manager with isolated state
      const freshConfigManager = new ConfigManager(
        path.join(freshTempDir, 'config'),
        freshStateDir
      );
      const freshEngine = new SyncEngine(freshConfig, freshConfigManager);
      
      const status = await freshEngine.getStatus();

      expect(status.lastSync).toBeNull();
      expect(status.fileCount).toBe(0);
      
      await cleanupTempDir(freshTempDir);
      await fs.rm(freshStateDir, { recursive: true, force: true });
    });
  });
});
