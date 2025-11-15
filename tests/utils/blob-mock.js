/**
 * Mock utilities for Netlify Blobs in tests
 * Provides in-memory storage for testing Blob operations
 */

import { vi } from 'vitest';

// In-memory blob storage
const blobStores = new Map();

/**
 * Mock Blob store with get, set, setJSON, delete methods
 */
class MockBlobStore {
  constructor(storeName) {
    this.storeName = storeName;
    if (!blobStores.has(storeName)) {
      blobStores.set(storeName, new Map());
    }
  }

  async get(key, options = {}) {
    const store = blobStores.get(this.storeName);
    const value = store.get(key);

    if (!value) {
      return null;
    }

    // Handle type option
    if (options.type === 'json') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }

    return value;
  }

  async set(key, value) {
    const store = blobStores.get(this.storeName);
    store.set(key, value);
  }

  async setJSON(key, value) {
    const store = blobStores.get(this.storeName);
    store.set(key, JSON.stringify(value));
  }

  async delete(key) {
    const store = blobStores.get(this.storeName);
    return store.delete(key);
  }

  async list() {
    const store = blobStores.get(this.storeName);
    const blobs = [];
    for (const [key] of store.entries()) {
      blobs.push({ key });
    }
    return { blobs };
  }
}

/**
 * Mock getStore function
 * This is the main export that replaces @netlify/blobs getStore
 */
export const mockGetStore = (storeName) => {
  return new MockBlobStore(storeName);
};

/**
 * Clear all blob stores (use in afterEach)
 */
export function clearBlobStores() {
  blobStores.clear();
}

/**
 * Get the contents of a specific blob store (for assertions)
 */
export function getBlobStoreContents(storeName) {
  const store = blobStores.get(storeName);
  if (!store) {
    return null;
  }

  const contents = {};
  for (const [key, value] of store.entries()) {
    try {
      contents[key] = JSON.parse(value);
    } catch {
      contents[key] = value;
    }
  }
  return contents;
}

/**
 * Set a value in a blob store (for test setup)
 */
export function setBlobStoreValue(storeName, key, value) {
  if (!blobStores.has(storeName)) {
    blobStores.set(storeName, new Map());
  }
  const store = blobStores.get(storeName);
  store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
}

/**
 * Setup Netlify Blobs mock for tests
 * Call this in beforeEach
 */
export function setupBlobMock() {
  vi.mock('@netlify/blobs', () => ({
    getStore: mockGetStore
  }));
}
