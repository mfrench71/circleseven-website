/**
 * Test Setup File
 *
 * Runs before all tests to configure the testing environment.
 */

import { vi } from 'vitest';

// Mock localStorage
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
};

global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.sessionStorage = sessionStorageMock;

// Mock window.alert, window.confirm, window.prompt
global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => '');

// Mock console methods to reduce noise (optional)
// Uncomment if you want to suppress console output in tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };

// Set up global API_BASE for tests
global.API_BASE = '/.netlify/functions';

// Mock window object properties
global.window = global.window || {};
global.window.API_BASE = '/.netlify/functions';

// Reset mocks before each test
beforeEach(() => {
  // Clear storage objects
  Object.keys(storage).forEach(key => delete storage[key]);

  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});
