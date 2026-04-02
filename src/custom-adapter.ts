/**
 * Custom API Adapter
 * Adapts to our self-hosted memory sync service
 */

import { MemoryFile, SyncConfig } from './types';
import { logger } from './utils/logger';

interface ApiFile {
  id: number;
  file_name: string;
  original_name: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface ApiResponse {
  files?: ApiFile[];
  count?: number;
  file?: ApiFile;
  message?: string;
}

export class CustomAdapter {
  private config: SyncConfig;
  private baseUrl: string;
  private token: string | null = null;

  constructor(config: SyncConfig) {
    this.config = config;
    this.baseUrl = process.env.MEMORY_SYNC_SERVER || 'http://localhost:8082';
  }

  /**
   * Authenticate with the server
   */
  async authenticate(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json() as { token: string };
      this.token = data.token;
      logger.info('Authenticated successfully');
      return true;
    } catch (error) {
      logger.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * List remote files
   */
  async listRemoteFiles(): Promise<{ path: string; hash: string; content?: string }[]> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/files`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      const data = await response.json() as ApiResponse;
      
      return (data.files || []).map(f => ({
        path: f.original_name,
        hash: f.file_hash,
      }));
    } catch (error) {
      logger.error('Failed to list remote files:', error);
      return [];
    }
  }

  /**
   * Upload files
   */
  async uploadFiles(files: MemoryFile[]): Promise<{ path: string }[]> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const results: { path: string }[] = [];

    for (const file of files) {
      try {
        const content = await this.readFileContent(file.path);
        const blob = new Blob([content], { type: 'text/markdown' });
        
        const formData = new FormData();
        formData.append('file', blob, file.path.split('/').pop() || 'file.md');

        const response = await fetch(`${this.baseUrl}/api/v1/files`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` },
          body: formData,
        });

        if (response.ok) {
          results.push({ path: file.path });
          logger.debug(`Uploaded: ${file.path}`);
        } else if (response.status === 409) {
          // File already exists
          results.push({ path: file.path });
          logger.debug(`File already exists: ${file.path}`);
        } else {
          throw new Error(`Upload failed: ${response.status}`);
        }
      } catch (error) {
        logger.error(`Failed to upload ${file.path}:`, error);
      }
    }

    return results;
  }

  /**
   * Delete remote file
   */
  async deleteRemoteFile(docId: string): Promise<void> {
    // Not implemented in our API yet
    logger.warn('Delete not implemented');
  }

  /**
   * Read file content
   */
  private async readFileContent(path: string): Promise<string> {
    const fs = require('fs').promises;
    return await fs.readFile(path, 'utf-8');
  }
}
