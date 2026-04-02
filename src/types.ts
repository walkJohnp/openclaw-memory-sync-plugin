/**
 * Type definitions for Memory Sync Plugin
 * Plugin → Sync Service architecture
 */

/** 记忆文件 */
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

/** 同步服务配置 */
export interface SyncServiceConfig {
  /** 同步服务地址 */
  serverUrl: string;
  /** API 密钥 */
  apiKey?: string;
  /** 请求超时（毫秒） */
  timeout: number;
}

/** 插件配置 */
export interface PluginConfig {
  source: {
    workspace: string;
    include: string[];
    exclude: string[];
  };
  service: SyncServiceConfig;
  strategy: {
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
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/** 同步状态 */
export interface SyncState {
  lastSyncAt: Date | null;
  files: SyncedFileState[];
}

/** 已同步文件状态 */
export interface SyncedFileState {
  path: string;
  hash: string;
  syncedAt: Date;
  remoteFileId?: string;
}

/** 同步计划 */
export interface SyncPlan {
  /** 需要上传的文件 */
  uploads: MemoryFile[];
  /** 需要删除的远程文件 */
  deletions: string[];
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  uploaded: number;
  deleted: number;
  errors: SyncError[];
  duration: number;
}

/** 同步错误 */
export interface SyncError {
  path: string;
  operation: 'upload' | 'delete';
  message: string;
  error: Error;
}

/** 文件变更 */
export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  file?: MemoryFile;
}

/** 同步服务响应 */
export interface SyncServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 上传文件请求 */
export interface UploadFileRequest {
  path: string;
  type: MemoryFileType;
  content: string;
  size: number;
  hash: string;
  modifiedAt: string;
}

/** 上传文件响应 */
export interface UploadFileResponse {
  fileId: string;
  url: string;
  syncedAt: string;
}

/** 同步服务文件信息 */
export interface RemoteFileInfo {
  path: string;
  fileId: string;
  hash: string;
  size: number;
  modifiedAt: string;
  syncedAt: string;
}

/** 服务健康状态 */
export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
}
