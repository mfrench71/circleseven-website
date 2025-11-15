/**
 * Mock for @netlify/blobs
 * Used in tests to avoid requiring Netlify environment configuration
 */

// In-memory blob storage for tests
const blobStores = new Map();

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
    if (!value) return null;

    if (options.type === 'json') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }
    return value;
  }

  async setJSON(key, value) {
    const store = blobStores.get(this.storeName);
    store.set(key, JSON.stringify(value));
  }

  async set(key, value) {
    const store = blobStores.get(this.storeName);
    store.set(key, value);
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

// Export for CommonJS
module.exports = {
  getStore: (storeName) => new MockBlobStore(storeName),
  // Export internals for test utilities
  __blobStores: blobStores
};
