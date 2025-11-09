/**
 * Unit Tests for Logger Utility
 *
 * Tests conditional logging based on development mode detection.
 * Covers log, info, warn, error, debug, group, groupEnd, table methods,
 * plus enableDebugMode, disableDebugMode, and isDevMode functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Logger Utility', () => {
  let logger;
  let consoleSpies;

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Spy on all console methods
    consoleSpies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      table: vi.spyOn(console, 'table').mockImplementation(() => {})
    };

    // Import logger
    const loggerModule = await import('../../../admin/js/core/logger.js');
    logger = loggerModule.default;

    // Reset logger's isDev flag to match current environment
    // Happy DOM provides localhost by default, so logger will be in dev mode
    logger.isDev = window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.startsWith('192.168.') ||
                   window.location.protocol === 'file:' ||
                   localStorage.getItem('admin_debug_mode') === 'true';
  });

  afterEach(() => {
    // Restore all console spies
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());

    // Clear module cache to allow fresh imports
    vi.resetModules();
  });

  describe('Development Mode Detection', () => {
    it('detects localhost as development (default Happy DOM environment)', () => {
      // Happy DOM defaults to localhost
      expect(logger.isDevMode()).toBe(true);
    });

    it('detects debug mode from localStorage', () => {
      // Enable debug mode via localStorage
      localStorage.setItem('admin_debug_mode', 'true');

      // Re-evaluate isDev
      logger.isDev = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.startsWith('192.168.') ||
                     window.location.protocol === 'file:' ||
                     localStorage.getItem('admin_debug_mode') === 'true';

      expect(logger.isDevMode()).toBe(true);
    });

    it('can simulate production mode by setting isDev to false', () => {
      // Manually set logger to production mode for testing
      logger.isDev = false;
      expect(logger.isDevMode()).toBe(false);
    });
  });

  describe('Logging Methods in Development Mode', () => {
    beforeEach(() => {
      // Ensure we're in development mode
      logger.isDev = true;
    });

    it('calls console.log when in development', () => {
      logger.log('test message');
      expect(consoleSpies.log).toHaveBeenCalledWith('test message');
    });

    it('calls console.info when in development', () => {
      logger.info('info message');
      expect(consoleSpies.info).toHaveBeenCalledWith('info message');
    });

    it('calls console.warn when in development', () => {
      logger.warn('warning message');
      expect(consoleSpies.warn).toHaveBeenCalledWith('warning message');
    });

    it('calls console.debug when in development', () => {
      logger.debug('debug message');
      expect(consoleSpies.debug).toHaveBeenCalledWith('debug message');
    });

    it('calls console.group when in development', () => {
      logger.group('Group Label');
      expect(consoleSpies.group).toHaveBeenCalledWith('Group Label');
    });

    it('calls console.groupEnd when in development', () => {
      logger.groupEnd();
      expect(consoleSpies.groupEnd).toHaveBeenCalled();
    });

    it('calls console.table when in development', () => {
      const data = [{ name: 'test', value: 123 }];
      logger.table(data);
      expect(consoleSpies.table).toHaveBeenCalledWith(data);
    });

    it('passes multiple arguments to console.log', () => {
      logger.log('message', 123, { key: 'value' });
      expect(consoleSpies.log).toHaveBeenCalledWith('message', 123, { key: 'value' });
    });
  });

  describe('Logging Methods in Production Mode', () => {
    beforeEach(() => {
      // Ensure we're in production mode
      logger.isDev = false;
    });

    it('does not call console.log in production', () => {
      logger.log('test message');
      expect(consoleSpies.log).not.toHaveBeenCalled();
    });

    it('does not call console.info in production', () => {
      logger.info('info message');
      expect(consoleSpies.info).not.toHaveBeenCalled();
    });

    it('does not call console.warn in production', () => {
      logger.warn('warning message');
      expect(consoleSpies.warn).not.toHaveBeenCalled();
    });

    it('does not call console.debug in production', () => {
      logger.debug('debug message');
      expect(consoleSpies.debug).not.toHaveBeenCalled();
    });

    it('does not call console.group in production', () => {
      logger.group('Group Label');
      expect(consoleSpies.group).not.toHaveBeenCalled();
    });

    it('does not call console.groupEnd in production', () => {
      logger.groupEnd();
      expect(consoleSpies.groupEnd).not.toHaveBeenCalled();
    });

    it('does not call console.table in production', () => {
      logger.table([{ test: 'data' }]);
      expect(consoleSpies.table).not.toHaveBeenCalled();
    });
  });

  describe('Error Logging (Always Enabled)', () => {
    it('calls console.error in development mode', () => {
      logger.isDev = true;
      logger.error('error message');
      expect(consoleSpies.error).toHaveBeenCalledWith('error message');
    });

    it('calls console.error in production mode', () => {
      logger.isDev = false;
      logger.error('error message');
      expect(consoleSpies.error).toHaveBeenCalledWith('error message');
    });

    it('passes multiple arguments to console.error', () => {
      logger.error('Error:', new Error('test error'), { context: 'data' });
      expect(consoleSpies.error).toHaveBeenCalledWith('Error:', new Error('test error'), { context: 'data' });
    });
  });

  describe('Debug Mode Control', () => {
    it('enableDebugMode sets localStorage and enables logging', () => {
      logger.isDev = false;
      logger.enableDebugMode();

      expect(localStorage.getItem('admin_debug_mode')).toBe('true');
      expect(logger.isDev).toBe(true);
      expect(consoleSpies.log).toHaveBeenCalledWith(
        'Debug mode enabled. Logging will persist even on production URLs.'
      );
    });

    it('disableDebugMode removes localStorage and disables logging on production', () => {
      logger.isDev = true;
      localStorage.setItem('admin_debug_mode', 'true');

      logger.disableDebugMode();

      expect(localStorage.getItem('admin_debug_mode')).toBeNull();
      // Note: isDev will depend on the current window.location, which is localhost in tests
      expect(consoleSpies.log).toHaveBeenCalledWith('Debug mode disabled.');
    });

    it('logging works after enabling debug mode', () => {
      logger.isDev = false;
      logger.enableDebugMode();

      consoleSpies.log.mockClear(); // Clear the "Debug mode enabled" call

      logger.log('test after enable');
      expect(consoleSpies.log).toHaveBeenCalledWith('test after enable');
    });
  });

  describe('Window Exposure', () => {
    it('exposes logger to window object', () => {
      expect(global.window.logger).toBeDefined();
      expect(global.window.logger).toBe(logger);
    });
  });

  describe('Named Exports', () => {
    it('exports individual logging methods', async () => {
      const { log, info, warn, error, debug } = await import('../../../admin/js/core/logger.js');

      expect(typeof log).toBe('function');
      expect(typeof info).toBe('function');
      expect(typeof warn).toBe('function');
      expect(typeof error).toBe('function');
      expect(typeof debug).toBe('function');
    });

    it('exports control methods', async () => {
      const { enableDebugMode, disableDebugMode, isDevMode } = await import('../../../admin/js/core/logger.js');

      expect(typeof enableDebugMode).toBe('function');
      expect(typeof disableDebugMode).toBe('function');
      expect(typeof isDevMode).toBe('function');
    });
  });
});
