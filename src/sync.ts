/**
 * Sync Engine
 * Plugin → Sync Service architecture
 */

import { MemoryScanner } from './scanner';
import { SyncServiceClient } from './service-client';
import { ConfigManager } from './config';
import { 
  MemoryFile, 
  PluginConfig, 
  SyncPlan, 
  SyncResult, 
  SyncState,
  SyncedFileState,
  UploadFileRequest,
} from './types';
import { hashesEqual } from './utils/hash';
import { logger } from './utils/logger';

export class SyncEngine {
  private config: PluginConfig;
  private scanner: MemoryScanner;
  private client: SyncServiceClient;
  private configManager: ConfigManager;

  constructor(config: PluginConfig, configManager?: ConfigManager) {
    this.config = config;
    this.scanner = new MemoryScanner(config);
    this.client = new SyncServiceClient(config.service);
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * Perform synchronization to sync service
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    logger.info('Starting memory sync to service...');

    try {
      // Check service health
      const health = await this.client.health();
      if (!health) {
        throw new Error('Sync service is not available');
      }
      logger.info(`Connected to sync service v${health.version}`);

      // Load previous state
      const state = await this.configManager.loadState();
      
      // Scan local files
      logger.info('Scanning local files...');
      const localFiles = await this.scanner.scan();
      logger.info(`Found ${localFiles.length} local files`);
      
      // Get remote files from service (for incremental sync)
      let remoteFiles: { path: string; hash: string; fileId: string }[] = [];
      if (this.config.strategy.syncMode === 'incremental') {
        logger.info('Fetching remote file list from service...');
        const files = await this.client.listFiles();
        remoteFiles = files.map(f => ({ path: f.path, hash: f.hash, fileId: f.fileId }));
        logger.info(`Found ${remoteFiles.length} remote files`);
      }

      // Build sync plan
      logger.info('Building sync plan...');
      const plan = this.buildSyncPlan(localFiles, remoteFiles, state);
      logger.info(`Sync plan: ${plan.uploads.length} uploads, ${plan.deletions.length} deletions`);
      
      // Execute sync plan
      const result = await this.executeSyncPlan(plan, localFiles);

      result.duration = Date.now() - startTime;
      logger.info(`Sync completed in ${result.duration}ms`);
      
      return result;

    } catch (error) {
      logger.error('Sync failed:', error);
      return {
        success: false,
        uploaded: 0,
        deleted: 0,
        errors: [{
          path: '',
          operation: 'upload',
          message: error instanceof Error ? error.message : 'Sync failed',
          error: error as Error,
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build sync plan
   */
  private buildSyncPlan(
    localFiles: MemoryFile[],
    remoteFiles: { path: string; hash: string; fileId: string }[],
    state: { files: SyncedFileState[] }
  ): SyncPlan {
    const uploads: MemoryFile[] = [];
    const deletions: string[] = [];

    const remoteMap = new Map(remoteFiles.map(f => [f.path, f]));
    const localMap = new Map(localFiles.map(f => [f.path, f]));
    const stateMap = new Map(state.files.map(f => [f.path, f]));

    // Check local files
    for (const localFile of localFiles) {
      const remoteFile = remoteMap.get(localFile.path);
      const stateFile = stateMap.get(localFile.path);

      if (!remoteFile) {
        // New file - upload
        uploads.push(localFile);
        logger.debug(`Plan: upload new file ${localFile.path}`);
      } else if (!hashesEqual(localFile.hash, remoteFile.hash)) {
        // Modified file - upload
        uploads.push(localFile);
        logger.debug(`Plan: upload modified file ${localFile.path}`);
      } else {
        // Unchanged - skip
        logger.debug(`Plan: skip unchanged file ${localFile.path}`);
      }
    }

    // Check for deletions
    if (this.config.strategy.deleteRemote) {
      for (const remoteFile of remoteFiles) {
        if (!localMap.has(remoteFile.path)) {
          deletions.push(remoteFile.fileId);
          logger.debug(`Plan: delete remote file ${remoteFile.path}`);
        }
      }
    }

    return { uploads, deletions };
  }

  /**
   * Execute sync plan
   */
  private async executeSyncPlan(
    plan: SyncPlan, 
    localFiles: MemoryFile[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      deleted: 0,
      errors: [],
      duration: 0,
    };

    // Upload files
    if (plan.uploads.length > 0) {
      logger.info(`Uploading ${plan.uploads.length} files to sync service...`);
      
      const uploadRequests: UploadFileRequest[] = plan.uploads.map(file => ({
        path: file.path,
        type: file.type,
        content: file.content,
        size: file.size,
        hash: file.hash,
        modifiedAt: file.modifiedAt.toISOString(),
      }));

      try {
        const uploadResults = await this.client.uploadFiles(uploadRequests);
        result.uploaded = uploadResults.length;
        
        // Save state for uploaded files
        const syncedFiles: SyncedFileState[] = plan.uploads.map((file, index) => ({
          path: file.path,
          hash: file.hash,
          syncedAt: new Date(),
          remoteFileId: uploadResults[index]?.fileId,
        }));
        
        await this.saveSyncState(localFiles, syncedFiles);
        
        logger.info(`Successfully uploaded ${uploadResults.length} files`);
      } catch (error) {
        result.errors.push({
          path: '',
          operation: 'upload',
          message: error instanceof Error ? error.message : 'Upload failed',
          error: error as Error,
        });
      }
    }

    // Delete remote files
    if (plan.deletions.length > 0) {
      logger.info(`Deleting ${plan.deletions.length} remote files...`);
      
      for (const fileId of plan.deletions) {
        try {
          await this.client.deleteFile(fileId);
          result.deleted++;
        } catch (error) {
          result.errors.push({
            path: fileId,
            operation: 'delete',
            message: error instanceof Error ? error.message : 'Delete failed',
            error: error as Error,
          });
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Save sync state
   */
  private async saveSyncState(
    localFiles: MemoryFile[], 
    syncedFiles: SyncedFileState[]
  ): Promise<void> {
    const stateMap = new Map(syncedFiles.map(f => [f.path, f]));
    
    // Merge with existing state
    const state: SyncState = {
      lastSyncAt: new Date(),
      files: localFiles.map(f => {
        const synced = stateMap.get(f.path);
        return synced || {
          path: f.path,
          hash: f.hash,
          syncedAt: new Date(),
        };
      }),
    };

    await this.configManager.saveState({
      lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
      files: state.files,
    });
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<{ 
    lastSync: Date | null; 
    fileCount: number;
    serviceStatus: 'connected' | 'disconnected';
  }> {
    const state = await this.configManager.loadState();
    const health = await this.client.health();
    
    return {
      lastSync: state.lastSyncAt ? new Date(state.lastSyncAt) : null,
      fileCount: state.files.length,
      serviceStatus: health ? 'connected' : 'disconnected',
    };
  }
}

export default SyncEngine;