/**
 * Logger tests
 */

import Logger from '../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('info');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('log levels', () => {
    it('should log info when level is info', () => {
      logger.info('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log debug when level is info', () => {
      logger.debug('debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log debug when level is debug', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warn when level is info', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('warning message');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should log error when level is info', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('error message');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('message format', () => {
    it('should include timestamp', () => {
      logger.info('test');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include prefix', () => {
      logger.info('test');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('[MemorySync]');
    });

    it('should include log level', () => {
      logger.info('test');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });
  });

  describe('setLevel', () => {
    it('should change log level', () => {
      logger.setLevel('error');
      logger.info('should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
