/**
 * Hash utility tests
 */

import { calculateHash, calculateHashBuffer, hashesEqual, shortHash } from '../src/utils/hash';

describe('Hash utilities', () => {
  describe('calculateHash', () => {
    it('should calculate SHA256 hash of string', () => {
      const content = 'test content';
      const hash = calculateHash(content);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = calculateHash('content1');
      const hash2 = calculateHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same content', () => {
      const content = 'same content';
      const hash1 = calculateHash(content);
      const hash2 = calculateHash(content);

      expect(hash1).toBe(hash2);
    });
  });

  describe('calculateHashBuffer', () => {
    it('should calculate hash of buffer', () => {
      const buffer = Buffer.from('test content');
      const hash = calculateHashBuffer(buffer);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('should produce same hash as string version for same content', () => {
      const content = 'test content';
      const stringHash = calculateHash(content);
      const bufferHash = calculateHashBuffer(Buffer.from(content, 'utf-8'));

      expect(stringHash).toBe(bufferHash);
    });
  });

  describe('hashesEqual', () => {
    it('should return true for equal hashes', () => {
      const hash = calculateHash('content');
      expect(hashesEqual(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = calculateHash('content1');
      const hash2 = calculateHash('content2');
      expect(hashesEqual(hash1, hash2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const hash = calculateHash('content');
      expect(hashesEqual(hash, hash.toUpperCase())).toBe(false);
    });
  });

  describe('shortHash', () => {
    it('should return first 8 characters', () => {
      const hash = calculateHash('content');
      const short = shortHash(hash);

      expect(short.length).toBe(8);
      expect(short).toBe(hash.substring(0, 8));
    });
  });
});
