/**
 * Test setup
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Global test utilities
declare global {
  var createTempDir: () => Promise<string>;
  var cleanupTempDir: (dir: string) => Promise<void>;
  var createMockFile: (dir: string, filePath: string, content: string) => Promise<void>;
}

// Create temporary directory for tests
global.createTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-sync-test-'));
  return tempDir;
};

// Cleanup temporary directory
global.cleanupTempDir = async (dir: string): Promise<void> => {
  await fs.rm(dir, { recursive: true, force: true });
};

// Create mock file in directory
global.createMockFile = async (dir: string, filePath: string, content: string): Promise<void> => {
  const fullPath = path.join(dir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
};

// Silence console during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Increase timeout for async tests
jest.setTimeout(10000);
