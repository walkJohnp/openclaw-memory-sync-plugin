/**
 * Hash utilities for content comparison
 */

import * as crypto from 'crypto';

/**
 * Calculate SHA256 hash of content
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Calculate hash of file buffer
 */
export function calculateHashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compare two hashes for equality
 */
export function hashesEqual(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Generate a short hash (first 8 chars) for display
 */
export function shortHash(hash: string): string {
  return hash.substring(0, 8);
}
