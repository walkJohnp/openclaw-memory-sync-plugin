/**
 * MemoryScanner Tests
 */

import { MemoryScanner } from '../src/scanner';
import { SyncConfig } from '../src/types';
import * as path from 'path';
import { createTempDir, cleanupTempDir, createMockFile } from './test-utils';

describe('MemoryScanner', () => {
  let tempDir: string;
  let scanner: MemoryScanner;
  let config: SyncConfig;

  beforeEach(async () => {
    tempDir = await createTempDir();
    config = {
      source: {
        workspace: tempDir,
        include: ['MEMORY.md', 'memory/*.md', 'AGENTS.md', 'SOUL.md'],
        exclude: ['*.secret.md', 'node_modules/**'],
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
        logLevel: 'info',
      },
    };
    scanner = new MemoryScanner(config);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('scan', () => {
    it('should scan MEMORY.md', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Long Term Memory');

      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('MEMORY.md');
      expect(files[0].type).toBe('long_term');
    });

    it('should scan memory/*.md files', async () => {
      await createMockFile(tempDir, 'memory/2026-03-30.md', '# Today');
      await createMockFile(tempDir, 'memory/2026-03-29.md', '# Yesterday');

      const files = await scanner.scan();

      expect(files).toHaveLength(2);
      expect(files.every(f => f.type === 'daily')).toBe(true);
    });

    it('should classify AGENTS.md as config', async () => {
      await createMockFile(tempDir, 'AGENTS.md', '# Agents');

      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('config');
    });

    it('should classify SOUL.md as identity', async () => {
      await createMockFile(tempDir, 'SOUL.md', '# Soul');

      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('identity');
    });

    it('should exclude files matching exclude patterns', async () => {
      await createMockFile(tempDir, 'MEMORY.md', '# Memory');
      await createMockFile(tempDir, 'test.secret.md', '# Secret');

      const files = await scanner.scan();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('MEMORY.md');
    });

    it('should calculate hash for content', async () => {
      const content = '# Test Content';
      await createMockFile(tempDir, 'MEMORY.md', content);

      const files = await scanner.scan();

      expect(files[0].hash).toBeDefined();
      expect(files[0].hash.length).toBe(64); // SHA256 hex length
    });

    it('should return empty array when no files match', async () => {
      const files = await scanner.scan();
      expect(files).toHaveLength(0);
    });
  });

  describe('file classification', () => {
    it('should get correct emoji for each type', () => {
      expect(MemoryScanner.getFileTypeEmoji('long_term')).toBe('🧠');
      expect(MemoryScanner.getFileTypeEmoji('daily')).toBe('📅');
      expect(MemoryScanner.getFileTypeEmoji('config')).toBe('⚙️');
      expect(MemoryScanner.getFileTypeEmoji('identity')).toBe('👤');
    });

    it('should get correct name for each type', () => {
      expect(MemoryScanner.getFileTypeName('long_term')).toBe('长期记忆');
      expect(MemoryScanner.getFileTypeName('daily')).toBe('每日记忆');
    });
  });
});
