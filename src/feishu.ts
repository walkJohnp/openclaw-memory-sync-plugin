/**
 * Feishu Integration Module
 * Handles document creation, update, and management
 */

import { MemoryFile, MemoryFileType, FeishuDocStructure, SyncConfig } from './types';
import { logger } from './utils/logger';

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

export class FeishuAdapter {
  private config: SyncConfig;
  private docStructure: FeishuDocStructure | null = null;

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

    // For now, we'll create a new document structure
    // In production, this would check if docs already exist
    this.docStructure = await this.createDocumentStructure();
    return this.docStructure;
  }

  /**
   * Create document structure in Feishu
   */
  private async createDocumentStructure(): Promise<FeishuDocStructure> {
    logger.info('Creating Feishu document structure...');

    // This is a placeholder - actual implementation would use feishu_doc tool
    // For now, we return a mock structure
    const structure: FeishuDocStructure = {
      rootDocId: '',
      categories: {},
    };

    if (this.config.target.categorize) {
      // Create category documents
      for (const [type, name] of Object.entries(CATEGORY_NAMES)) {
        logger.debug(`Creating category: ${name}`);
        // In real implementation, call feishu_doc.create
      }
    }

    return structure;
  }

  /**
   * Upload a memory file to Feishu
   */
  async uploadFile(file: MemoryFile): Promise<{ docId: string; blockId?: string }> {
    logger.info(`Uploading ${file.path}...`);

    const structure = await this.initialize();
    
    // Determine target document based on file type
    const targetDocId = this.getTargetDocId(file.type, structure);
    
    // Convert markdown content for Feishu
    const feishuContent = this.convertToFeishuFormat(file);
    
    // In real implementation, this would call feishu_doc tool
    // For now, we log the action
    logger.debug(`Would upload to doc ${targetDocId}`);
    logger.debug(`Content length: ${feishuContent.length} chars`);

    return {
      docId: targetDocId || 'mock-doc-id',
      blockId: undefined,
    };
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
   * List remote files (placeholder)
   */
  async listRemoteFiles(): Promise<any[]> {
    // In real implementation, query Feishu for existing files
    return [];
  }

  /**
   * Delete remote file (placeholder)
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

    // In real implementation, call feishu_doc.create
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

    // In real implementation, call feishu_doc.create
    return `mock-${type}-doc-id`;
  }
}

export default FeishuAdapter;
