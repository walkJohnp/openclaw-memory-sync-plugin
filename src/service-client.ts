/**
 * Sync Service Client
 * Handles communication with the sync server
 */

import {
  PluginConfig,
  SyncServiceResponse,
  UploadFileRequest,
  UploadFileResponse,
  RemoteFileInfo,
  ServiceHealth,
} from './types';
import { logger } from './utils/logger';

export class SyncServiceClient {
  private config: PluginConfig['service'];
  private baseUrl: string;

  constructor(config: PluginConfig['service']) {
    this.config = config;
    this.baseUrl = config.serverUrl.replace(/\/$/, '');
  }

  /**
   * Check service health
   */
  async health(): Promise<ServiceHealth | null> {
    try {
      const response = await this.fetchWithTimeout('/api/health');
      if (!response.ok) {
        logger.warn(`Service health check failed: ${response.status}`);
        return null;
      }
      return await response.json() as ServiceHealth;
    } catch (error) {
      logger.error('Service health check error:', error);
      return null;
    }
  }

  /**
   * Get list of remote files
   */
  async listFiles(): Promise<RemoteFileInfo[]> {
    try {
      const response = await this.fetchWithTimeout('/api/files');
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }
      const result = await response.json() as SyncServiceResponse<RemoteFileInfo[]>;
      return result.data || [];
    } catch (error) {
      logger.error('Failed to list remote files:', error);
      throw error;
    }
  }

  /**
   * Upload a file to sync service
   */
  async uploadFile(file: UploadFileRequest): Promise<UploadFileResponse> {
    try {
      const response = await this.fetchWithTimeout('/api/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(file),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const result = await response.json() as SyncServiceResponse<UploadFileResponse>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.data;
    } catch (error) {
      logger.error(`Failed to upload file ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: UploadFileRequest[]): Promise<UploadFileResponse[]> {
    const results: UploadFileResponse[] = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadFile(file);
        results.push(result);
        logger.debug(`Uploaded ${file.path} -> ${result.fileId}`);
      } catch (error) {
        logger.error(`Failed to upload ${file.path}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete a remote file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to delete file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ lastSync: string | null; pending: number }> {
    try {
      const response = await this.fetchWithTimeout('/api/sync/status');
      if (!response.ok) {
        throw new Error(`Failed to get sync status: ${response.status}`);
      }
      const result = await response.json() as SyncServiceResponse<{ lastSync: string | null; pending: number }>;
      return result.data || { lastSync: null, pending: 0 };
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Fetch with timeout and auth
   */
  private async fetchWithTimeout(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default SyncServiceClient;
