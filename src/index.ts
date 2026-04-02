/**
 * OpenClaw Memory Sync Plugin
 * Main entry point - Plugin → Sync Service architecture
 */

export { MemoryScanner } from './scanner';
export { SyncServiceClient } from './service-client';
export { SyncEngine } from './sync';
export { ConfigManager } from './config';
export * from './types';
export { logger } from './utils/logger';

// Version
export const VERSION = '0.2.0';

// Default export
export { SyncEngine as default } from './sync';
