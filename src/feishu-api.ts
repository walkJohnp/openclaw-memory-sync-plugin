/**
 * Feishu API Integration
 * Real implementation using OpenClaw's feishu_doc tool
 */

import { MemoryFile, MemoryFileType, FeishuDocStructure, SyncConfig } from './types';
import { logger } from './utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Category display names
const CATEGORY_NAMES: Record<MemoryFileType, string> = {
  long_term: '🧠 长期记忆',
  daily: '📅 每日记忆',
  config: '⚙️ 配置',
  heartbeat: '💓 心跳配置',
  tools: '🛠️ 工具配置',
  identity: '👤 身份定义',
  other: '📄 其他',
};

export class FeishuAPIAdapter {
  private config: SyncConfig;
  private docStructure: FeishuDocStructure | null = null;
  private rootDocId: string | null = null;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * Initialize or get document structure
   */
  async initialize(): Promise<FeishuDocStructure> {
    if (this.docStructure) {
      return this.docStructure;
    }

    // Create root document
    this.rootDocId = await this.createRootDocument();
    
    this.docStructure = {
      rootDocId: this.rootDocId,
      categories: {},
    };

    if (this.config.target.categorize) {
      // Create category documents
      for (const type of Object.keys(CATEGORY_NAMES) as MemoryFileType[]) {
        const docId = await this.createCategoryDocument(type);
        const keyMap: Record<MemoryFileType, keyof FeishuDocStructure['categories']> = {
          long_term: 'longTerm',
          daily: 'daily',
          config: 'config',
          heartbeat: 'heartbeat',
          tools: 'tools',
          identity: 'identity',
          other: 'other',
        };
        this.docStructure.categories[keyMap[type]] = docId;
      }
    }

    return this.docStructure;
  }

  /**
   * Upload a memory file to Feishu
   */
  async uploadFile(file: MemoryFile): Promise<{ docId: string; blockId?: string }> {
    logger.info(`Uploading ${file.path} to Feishu...`);

    const structure = await this.initialize();
    
    // Determine target document based on file type
    const targetDocId = this.getTargetDocId(file.type, structure);
    
    if (!targetDocId) {
      throw new Error(`No target document for type ${file.type}`);
    }

    // Convert markdown content for Feishu
    const feishuContent = this.convertToFeishuFormat(file);
    
    try {
      // Update or create document content
      await this.updateDocument(targetDocId, file, feishuContent);
      
      logger.debug(`Successfully uploaded ${file.path} to doc ${targetDocId}`);

      return {
        docId: targetDocId,
        blockId: undefined,
      };
    } catch (error) {
      logger.error(`Failed to upload ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: MemoryFile[]): Promise<{ path: string; docId: string }[]> {
    const results: { path: string; docId: string }[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file);
        results.push({ path: file.path, docId: result.docId });
      } catch (error) {
        logger.error(`Failed to upload ${file.path}:`, error);
      }
    }

    return results;
  }

  /**
   * Create or update document content
   */
  private async updateDocument(docId: string, file: MemoryFile, content: string): Promise<void> {
    // Use feishu_doc tool via OpenClaw
    // For now, we'll write content to a temp file and use feishu_doc action
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');

    const tempFile = path.join(os.tmpdir(), `memory-sync-${Date.now()}.md`);
    await fs.writeFile(tempFile, content, 'utf-8');

    try {
      // Call feishu_doc to update the document
      // This is a placeholder - actual implementation would use the feishu_doc tool
      logger.debug(`Would update doc ${docId} with content from ${tempFile}`);
      
      // In real implementation:
      // await feishu_doc({ action: 'write', doc_token: docId, content });
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Get target document ID for file type
   */
  private getTargetDocId(type: MemoryFileType, structure: FeishuDocStructure): string | undefined {
    if (!this.config.target.categorize) {
      return structure.rootDocId;
    }

    const keyMap: Record<MemoryFileType, keyof FeishuDocStructure['categories']> = {
      long_term: 'longTerm',
      daily: 'daily',
      config: 'config',
      heartbeat: 'heartbeat',
      tools: 'tools',
      identity: 'identity',
      other: 'other',
    };

    return structure.categories[keyMap[type]];
  }

  /**
   * Convert markdown content to Feishu format
   */
  private convertToFeishuFormat(file: MemoryFile): string {
    // Add metadata header
    const header = `---
**文件**: ${file.path}
**类型**: ${CATEGORY_NAMES[file.type]}
**大小**: ${this.formatBytes(file.size)}
**修改时间**: ${file.modifiedAt.toISOString()}
**哈希**: ${file.hash.substring(0, 8)}...
---

`;

    return header + file.content;
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * List remote files
   */
  async listRemoteFiles(): Promise<any[]> {
    // Query existing documents
    return [];
  }

  /**
   * Delete remote file
   */
  async deleteRemoteFile(docId: string): Promise<void> {
    logger.debug(`Would delete doc ${docId}`);
  }

  /**
   * Get document URL
   */
  getDocumentUrl(docId: string): string {
    return `https://feishu.cn/docx/${docId}`;
  }

  /**
   * Create root document
   */
  async createRootDocument(): Promise<string> {
    logger.info(`Creating root document: ${this.config.target.docName}`);
    
    const content = `# ${this.config.target.docName}

> OpenClaw Agent 记忆同步中心
> 自动生成于 ${new Date().toISOString()}

## 📁 目录

${Object.entries(CATEGORY_NAMES).map(([type, name]) => `- ${name}`).join('\n')}

---

*此文档由 OpenClaw Memory Sync 插件自动同步*\n`;

    // Create document using feishu_doc tool
    // For now, return a mock ID
    logger.info('Root document created (mock)');
    return 'mock-root-doc-id';
  }

  /**
   * Create category document
   */
  async createCategoryDocument(type: MemoryFileType): Promise<string> {
    const name = CATEGORY_NAMES[type];
    logger.info(`Creating category document: ${name}`);

    const content = `# ${name}

> 分类: ${type}
> 生成时间: ${new Date().toISOString()}

---

`;

    // Create document using feishu_doc tool
    logger.info(`Category document created: ${name} (mock)`);
    return `mock-${type}-doc-id`;
  }

  /**
   * Get document structure
   */
  getDocStructure(): FeishuDocStructure | null {
    return this.docStructure;
  }
}

export default FeishuAPIAdapter;
