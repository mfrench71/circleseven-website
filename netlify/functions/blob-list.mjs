/**
 * Blob Storage Inspector
 * Lists all items in the cache store to verify Blob storage is working
 */
import { getStore } from '@netlify/blobs';

export default async function handler(request, context) {
  try {
    const store = getStore('cache');
    
    // List all blobs in the cache store
    const { blobs } = await store.list();
    
    const blobInfo = await Promise.all(
      blobs.map(async (blob) => {
        const metadata = await store.getMetadata(blob.key);
        return {
          key: blob.key,
          size: blob.size,
          lastModified: blob.etag,
          metadata
        };
      })
    );
    
    return new Response(JSON.stringify({
      totalBlobs: blobs.length,
      blobs: blobInfo
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
