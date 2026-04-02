/**
 * Test utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'memory-sync-test-'));
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

export async function createMockFile(dir: string, filePath: string, content: string): Promise<void> {
  const fullPath = path.join(dir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
}
