/**
 * Memory File Scanner
 * Scans workspace for memory files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { MemoryFile, MemoryFileType, PluginConfig } from './types';
import { calculateHash } from './utils/hash';
import { logger } from './utils/logger';

export class MemoryScanner {
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  /**
   * Scan workspace for memory files
   */
  async scan(): Promise<MemoryFile[]> {
    const workspace = this.resolveWorkspace();
    logger.debug(`Scanning workspace: ${workspace}`);

    const files: MemoryFile[] = [];

    for (const pattern of this.config.source.include) {
      const matches = await this.globFiles(workspace, pattern);
      
      for (const match of matches) {
        if (this.shouldExclude(match)) {
          logger.debug(`Excluding file: ${match}`);
          continue;
        }

        try {
          const file = await this.readFile(workspace, match);
          files.push(file);
        } catch (error) {
          logger.warn(`Failed to read file ${match}:`, error);
        }
      }
    }

    logger.info(`Scanned ${files.length} memory files`);
    return files;
  }

  /**
   * Read a single file and create MemoryFile object
   */
  private async readFile(workspace: string, relativePath: string): Promise<MemoryFile> {
    const absolutePath = path.join(workspace, relativePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    const stats = await fs.stat(absolutePath);

    return {
      path: relativePath,
      absolutePath,
      type: this.classifyFile(relativePath),
      content,
      size: stats.size,
      modifiedAt: stats.mtime,
      hash: calculateHash(content),
    };
  }

  /**
   * Classify file by type based on path
   */
  private classifyFile(filePath: string): MemoryFileType {
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);

    // Long-term memory
    if (basename === 'MEMORY.md') {
      return 'long_term';
    }

    // Daily memory
    if (dirname === 'memory' && /^\d{4}-\d{2}-\d{2}\.md$/.test(basename)) {
      return 'daily';
    }

    // Config files
    if (['AGENTS.md', 'USER.md'].includes(basename)) {
      return 'config';
    }

    // Identity
    if (basename === 'SOUL.md' || basename === 'IDENTITY.md') {
      return 'identity';
    }

    // Heartbeat
    if (basename === 'HEARTBEAT.md') {
      return 'heartbeat';
    }

    // Tools
    if (basename === 'TOOLS.md') {
      return 'tools';
    }

    return 'other';
  }

  /**
   * Glob files matching pattern
   */
  private async globFiles(workspace: string, pattern: string): Promise<string[]> {
    const fullPattern = path.join(workspace, pattern);
    const matches = await glob(fullPattern, {
      cwd: workspace,
      absolute: false,
      nodir: true,
    });
    return matches;
  }

  /**
   * Check if file should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    for (const pattern of this.config.source.exclude) {
      if (this.matchPattern(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Match file path against pattern
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching
    const regex = pattern
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/<<<GLOBSTAR>>>/g, '.*');
    
    const regExp = new RegExp(`^${regex}$`);
    return regExp.test(filePath);
  }

  /**
   * Resolve workspace path (handle ~ expansion)
   */
  private resolveWorkspace(): string {
    let workspace = this.config.source.workspace;
    if (workspace.startsWith('~')) {
      workspace = path.join(process.env.HOME || '', workspace.slice(1));
    }
    return path.resolve(workspace);
  }

  /**
   * Get file type display name
   */
  static getFileTypeName(type: MemoryFileType): string {
    const names: Record<MemoryFileType, string> = {
      long_term: '长期记忆',
      daily: '每日记忆',
      config: '配置',
      heartbeat: '心跳配置',
      tools: '工具配置',
      identity: '身份定义',
      other: '其他',
    };
    return names[type];
  }

  /**
   * Get file type emoji
   */
  static getFileTypeEmoji(type: MemoryFileType): string {
    const emojis: Record<MemoryFileType, string> = {
      long_term: '🧠',
      daily: '📅',
      config: '⚙️',
      heartbeat: '💓',
      tools: '🛠️',
      identity: '👤',
      other: '📄',
    };
    return emojis[type];
  }
}

export default MemoryScanner;
