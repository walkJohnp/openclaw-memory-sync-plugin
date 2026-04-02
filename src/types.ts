/**
 * Type definitions for Memory Sync Plugin
 */

export interface MemoryFile {
  /** 文件路径（相对 workspace） */
  path: string;
  /** 文件绝对路径 */
  absolutePath: string;
  /** 文件类型 */
  type: MemoryFileType;
  /** 文件内容 */
  content: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间 */
  modifiedAt: Date;
  /** 内容哈希（用于变更检测） */
  hash: string;
}

export type MemoryFileType = 
  | 'long_term'    // MEMORY.md
  | 'daily'        // memory/YYYY-MM-DD.md
  | 'config'       // AGENTS.md, SOUL.md, USER.md, etc.
  | 'heartbeat'    // HEARTBEAT.md
  | 'tools'        // TOOLS.md
  | 'identity'     // IDENTITY.md
  | 'other';       // 其他

export interface SyncConfig {
  source: {
    workspace: string;
    include: string[];
    exclude: string[];
  };
  target: {
    folderToken: string;
    docName: string;
    categorize: boolean;
  };
  strategy: {
    conflictResolution: 'local_priority' | 'remote_priority' | 'manual';
    syncMode: 'incremental' | 'full';
    deleteRemote: boolean;
  };
  schedule: {
    enabled: boolean;
    interval: string;
  };
  advanced: {
    watch: boolean;
    compress: boolean;
    keepHistory: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface SyncState {
  lastSyncAt: Date | null;
  files: SyncedFileState[];
}

export interface SyncedFileState {
  path: string;
  hash: string;
  syncedAt: Date;
  remoteDocId?: string;
  remoteBlockId?: string;
}

export interface SyncPlan {
  /** 需要上传的文件 */
  uploads: MemoryFile[];
  /** 需要下载的文件 */
  downloads: RemoteFile[];
  /** 冲突的文件 */
  conflicts: Conflict[];
  /** 需要删除的云端文件 */
  deletions: RemoteFile[];
}

export interface RemoteFile {
  path: string;
  docId: string;
  blockId?: string;
  modifiedAt: Date;
  content?: string;
}

export interface Conflict {
  file: MemoryFile;
  remote: RemoteFile;
  type: 'modified_both' | 'deleted_local' | 'deleted_remote';
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  deleted: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  path: string;
  operation: 'upload' | 'download' | 'delete';
  message: string;
  error: Error;
}

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  file?: MemoryFile;
}

export interface FeishuDocStructure {
  rootDocId: string;
  categories: {
    longTerm?: string;
    daily?: string;
    config?: string;
    heartbeat?: string;
    tools?: string;
    identity?: string;
    other?: string;
  };
}
