/**
 * Sync Engine
 * Handles synchronization logic
 */

import { MemoryScanner } from './scanner';
import { FeishuAdapter } from './feishu';
import { ConfigManager } from './config';
import { 
  MemoryFile, 
  SyncConfig, 
  SyncPlan, 
  SyncResult, 
  SyncState,
  SyncedFileState,
  RemoteFile,
  Conflict,
} from './types';
import { hashesEqual } from './utils/hash';
import { logger } from './utils/logger';

export class SyncEngine {
  private config: SyncConfig;
  private scanner: MemoryScanner;
  private feishu: FeishuAdapter;
  private configManager: ConfigManager;

  constructor(config: SyncConfig, configManager?: ConfigManager) {
    this.config = config;
    this.scanner = new MemoryScanner(config);
    this.feishu = new FeishuAdapter(config);
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * Perform synchronization
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    logger.info('Starting memory sync...');

    try {
      // Load previous state
      const state = await this.configManager.loadState();
      
      // Scan local files
      logger.info('Scanning local files...');
      const localFiles = await this.scanner.scan();
      
      // List remote files (for incremental sync)
      let remoteFiles: RemoteFile[] = [];
      if (this.config.strategy.syncMode === 'incremental') {
        logger.info('Fetching remote files...');
        remoteFiles = await this.feishu.listRemoteFiles();
      }

      // Build sync plan
      logger.info('Building sync plan...');
      const plan = this.buildSyncPlan(localFiles, remoteFiles, state);
      
      // Execute sync plan
      logger.info(`Sync plan: ${plan.uploads.length} uploads, ${plan.downloads.length} downloads, ${plan.conflicts.length} conflicts`);
      
      const result = await this.executeSyncPlan(plan);
      
      // Save state
      if (result.success) {
        await this.saveSyncState(localFiles, result);
      }

      result.duration = Date.now() - startTime;
      logger.info(`Sync completed in ${result.duration}ms`);
      
      return result;

    } catch (error) {
      logger.error('Sync failed:', error);
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        deleted: 0,
        errors: [{
          path: '',
          operation: 'upload',
          message: 'Sync failed',
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
    remoteFiles: RemoteFile[],
    state: { files: SyncedFileState[] }
  ): SyncPlan {
    const uploads: MemoryFile[] = [];
    const downloads: RemoteFile[] = [];
    const conflicts: Conflict[] = [];
    const deletions: RemoteFile[] = [];

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
      } else if (!stateFile || !hashesEqual(localFile.hash, stateFile.hash)) {
        // Modified file - check for conflict
        if (remoteFile && stateFile && !hashesEqual(remoteFile.content || '', stateFile.hash)) {
          // Conflict: both modified
          conflicts.push({
            file: localFile,
            remote: remoteFile,
            type: 'modified_both',
          });
        } else {
          // No conflict - upload
          uploads.push(localFile);
        }
      }
    }

    // Check for deletions
    if (this.config.strategy.deleteRemote) {
      for (const remoteFile of remoteFiles) {
        if (!localMap.has(remoteFile.path)) {
          deletions.push(remoteFile);
        }
      }
    }

    return { uploads, downloads, conflicts, deletions };
  }

  /**
   * Execute sync plan
   */
  private async executeSyncPlan(plan: SyncPlan): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: plan.conflicts.length,
      deleted: 0,
      errors: [],
      duration: 0,
    };

    // Handle conflicts
    if (plan.conflicts.length > 0) {
      logger.warn(`Found ${plan.conflicts.length} conflicts`);
      for (const conflict of plan.conflicts) {
        const resolution = await this.resolveConflict(conflict);
        if (resolution === 'upload') {
          plan.uploads.push(conflict.file);
        } else if (resolution === 'download') {
          plan.downloads.push(conflict.remote);
        }
      }
    }

    // Upload files
    if (plan.uploads.length > 0) {
      logger.info(`Uploading ${plan.uploads.length} files...`);
      const uploadResults = await this.feishu.uploadFiles(plan.uploads);
      result.uploaded = uploadResults.length;
      
      if (uploadResults.length !== plan.uploads.length) {
        result.errors.push(...this.buildUploadErrors(plan.uploads, uploadResults));
      }
    }

    // Delete remote files
    if (plan.deletions.length > 0) {
      logger.info(`Deleting ${plan.deletions.length} remote files...`);
      for (const file of plan.deletions) {
        try {
          await this.feishu.deleteRemoteFile(file.docId);
          result.deleted++;
        } catch (error) {
          result.errors.push({
            path: file.path,
            operation: 'delete',
            message: 'Failed to delete',
            error: error as Error,
          });
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Resolve conflict based on strategy
   */
  private async resolveConflict(conflict: Conflict): Promise<'upload' | 'download' | 'skip'> {
    switch (this.config.strategy.conflictResolution) {
      case 'local_priority':
        logger.debug(`Conflict resolved: upload local (local_priority)`);
        return 'upload';
      case 'remote_priority':
        logger.debug(`Conflict resolved: download remote (remote_priority)`);
        return 'download';
      case 'manual':
        // In manual mode, we would prompt user - for now default to local
        logger.warn(`Conflict in ${conflict.file.path} - using local (manual mode not implemented)`);
        return 'upload';
      default:
        return 'upload';
    }
  }

  /**
   * Save sync state
   */
  private async saveSyncState(localFiles: MemoryFile[], result: SyncResult): Promise<void> {
    const state: { lastSyncAt: string | null; files: SyncedFileState[] } = {
      lastSyncAt: new Date().toISOString(),
      files: localFiles.map(f => ({
        path: f.path,
        hash: f.hash,
        syncedAt: new Date(),
      })),
    };

    await this.configManager.saveState(state);
  }

  /**
   * Build upload errors from results
   */
  private buildUploadErrors(files: MemoryFile[], results: { path: string }[]): { path: string; operation: 'upload'; message: string; error: Error }[] {
    const resultPaths = new Set(results.map(r => r.path));
    const errors: { path: string; operation: 'upload'; message: string; error: Error }[] = [];

    for (const file of files) {
      if (!resultPaths.has(file.path)) {
        errors.push({
          path: file.path,
          operation: 'upload',
          message: 'Upload failed',
          error: new Error('Unknown error'),
        });
      }
    }

    return errors;
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<{ lastSync: Date | null; fileCount: number }> {
    const state = await this.configManager.loadState();
    return {
      lastSync: state.lastSyncAt ? new Date(state.lastSyncAt) : null,
      fileCount: state.files.length,
    };
  }
}

export default SyncEngine;
