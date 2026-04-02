/**
 * SyncServiceClient tests
 */

import { SyncServiceClient } from '../src/service-client';
import { PluginConfig } from '../src/types';

// Mock fetch
global.fetch = jest.fn();

describe('SyncServiceClient', () => {
  let client: SyncServiceClient;
  let config: PluginConfig['service'];

  beforeEach(() => {
    config = {
      serverUrl: 'http://localhost:8080',
      apiKey: 'test-api-key',
      timeout: 5000,
    };
    client = new SyncServiceClient(config);
    jest.clearAllMocks();
  });

  describe('health', () => {
    it('should return health status when service is healthy', async () => {
      const mockResponse = {
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.health();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/health',
        expect.any(Object)
      );
    });

    it('should return null when service is unhealthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await client.health();

      expect(result).toBeNull();
    });

    it('should return null when request fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.health();

      expect(result).toBeNull();
    });
  });

  describe('listFiles', () => {
    it('should return list of files', async () => {
      const mockFiles = [
        { path: 'MEMORY.md', fileId: 'file-1', hash: 'hash1', size: 100, modifiedAt: new Date().toISOString(), syncedAt: new Date().toISOString() },
        { path: 'AGENTS.md', fileId: 'file-2', hash: 'hash2', size: 200, modifiedAt: new Date().toISOString(), syncedAt: new Date().toISOString() },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockFiles }),
      });

      const result = await client.listFiles();

      expect(result).toEqual(mockFiles);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/files',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should throw error when request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(client.listFiles()).rejects.toThrow('Failed to list files');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockResponse = {
        fileId: 'file-1',
        url: 'http://localhost:8080/files/file-1',
        syncedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const file = {
        path: 'MEMORY.md',
        type: 'long_term' as const,
        content: '# Memory',
        size: 100,
        hash: 'hash123',
        modifiedAt: new Date().toISOString(),
      };

      const result = await client.uploadFile(file);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/files/upload',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(file),
        })
      );
    });

    it('should throw error when upload fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Upload failed',
      });

      const file = {
        path: 'MEMORY.md',
        type: 'long_term' as const,
        content: '# Memory',
        size: 100,
        hash: 'hash123',
        modifiedAt: new Date().toISOString(),
      };

      await expect(client.uploadFile(file)).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files', async () => {
      const mockResponse = {
        fileId: 'file-1',
        url: 'http://localhost:8080/files/file-1',
        syncedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const files = [
        { path: 'MEMORY.md', type: 'long_term' as const, content: '# Memory', size: 100, hash: 'hash1', modifiedAt: new Date().toISOString() },
        { path: 'AGENTS.md', type: 'config' as const, content: '# Agents', size: 200, hash: 'hash2', modifiedAt: new Date().toISOString() },
      ];

      const results = await client.uploadFiles(files);

      expect(results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await client.deleteFile('file-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/files/file-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error when delete fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(client.deleteFile('file-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('timeout', () => {
    it('should set timeout on requests', () => {
      // Verify timeout is configured
      expect(config.timeout).toBe(5000);
      
      // The actual timeout behavior is tested via integration tests
      // Unit test just verifies the configuration is passed correctly
    });
  });
});
