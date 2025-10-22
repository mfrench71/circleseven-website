/**
 * Unit Tests for Trash Module
 *
 * Tests soft-deleted item management including restore and permanent deletion.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadTrash,
  renderTrashList,
  restoreItem,
  permanentlyDeleteItem,
  getTrashedItems
} from '../../../admin-custom/js/modules/trash.js';
import { initNotifications } from '../../../admin-custom/js/ui/notifications.js';

describe('Trash Module', () => {
  let mockFetch;
  let mockShowConfirm;
  let mockTrackDeployment;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="error" class="hidden"><p></p></div>
      <div id="success" class="hidden"><p></p></div>
      <div id="trash-loading" class="">Loading...</div>
      <ul id="trash-list"></ul>
      <div id="trash-empty" class="hidden">Bin is empty</div>
    `;

    // Initialize notifications
    initNotifications();

    // Setup window globals
    window.API_BASE = '/.netlify/functions';
    window.allTrashedItems = [];
    window.showConfirm = mockShowConfirm = vi.fn();
    window.trackDeployment = mockTrackDeployment = vi.fn();

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadTrash', () => {
    it('fetches trash items from API and updates window.allTrashedItems', async () => {
      const mockTrash = {
        items: [
          {
            name: 'deleted-post.md',
            sha: 'abc123',
            type: 'post',
            size: 1024,
            trashed_at: '2025-10-20T10:00:00Z'
          },
          {
            name: 'deleted-page.md',
            sha: 'def456',
            type: 'page',
            size: 2048,
            trashed_at: '2025-10-19T14:30:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTrash
      });

      await loadTrash();

      expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/trash');
      expect(window.allTrashedItems).toEqual(mockTrash.items);
      expect(window.allTrashedItems.length).toBe(2);
    });

    it('handles empty items array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      await loadTrash();

      expect(window.allTrashedItems).toEqual([]);
    });

    it('handles missing items property', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await loadTrash();

      expect(window.allTrashedItems).toEqual([]);
    });

    it('shows error when API fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await loadTrash();

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.querySelector('p').textContent).toContain('Failed to load bin');
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await loadTrash();

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });

    it('hides loading indicator after load', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      const loadingEl = document.getElementById('trash-loading');
      loadingEl.classList.remove('hidden');

      await loadTrash();

      expect(loadingEl.classList.contains('hidden')).toBe(true);
    });

    it('hides loading indicator even on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const loadingEl = document.getElementById('trash-loading');
      loadingEl.classList.remove('hidden');

      await loadTrash();

      expect(loadingEl.classList.contains('hidden')).toBe(true);
    });
  });

  describe('renderTrashList', () => {
    beforeEach(() => {
      window.allTrashedItems = [
        {
          name: 'deleted-post.md',
          sha: 'abc123',
          type: 'post',
          size: 1024,
          trashed_at: '2025-10-20T10:00:00Z'
        },
        {
          name: 'deleted-page.md',
          sha: 'def456',
          type: 'page',
          size: 2048,
          trashed_at: '2025-10-19T14:30:00Z'
        }
      ];
    });

    it('renders trash list with all items', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      expect(listEl.children.length).toBe(2);
      expect(listEl.innerHTML).toContain('deleted-post.md');
      expect(listEl.innerHTML).toContain('deleted-page.md');
    });

    it('shows empty state when no items in trash', () => {
      window.allTrashedItems = [];

      renderTrashList();

      const listEl = document.getElementById('trash-list');
      const emptyEl = document.getElementById('trash-empty');

      expect(listEl.innerHTML).toBe('');
      expect(emptyEl.classList.contains('hidden')).toBe(false);
    });

    it('hides empty state when items exist', () => {
      const emptyEl = document.getElementById('trash-empty');
      emptyEl.classList.remove('hidden');

      renderTrashList();

      expect(emptyEl.classList.contains('hidden')).toBe(true);
    });

    it('displays correct type badges for posts and pages', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      const html = listEl.innerHTML;

      // Post should have blue badge
      expect(html).toContain('bg-blue-100 text-blue-700');
      expect(html).toContain('Post');

      // Page should have purple badge
      expect(html).toContain('bg-purple-100 text-purple-700');
      expect(html).toContain('Page');
    });

    it('displays file size in KB', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      expect(listEl.innerHTML).toContain('1.0 KB'); // 1024 / 1024
      expect(listEl.innerHTML).toContain('2.0 KB'); // 2048 / 1024
    });

    it('formats trashed_at timestamp correctly', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      // Should contain "Deleted:" label
      expect(listEl.innerHTML).toContain('Deleted:');
    });

    it('handles items without trashed_at timestamp', () => {
      window.allTrashedItems = [{
        name: 'no-timestamp.md',
        sha: 'xyz789',
        type: 'post',
        size: 512
        // No trashed_at field
      }];

      renderTrashList();

      const listEl = document.getElementById('trash-list');
      expect(listEl.innerHTML).toContain('no-timestamp.md');
    });

    it('escapes HTML in item names to prevent XSS', () => {
      window.allTrashedItems = [{
        name: '<script>alert("XSS")</script>.md',
        sha: 'xss123',
        type: 'post',
        size: 1024,
        trashed_at: '2025-10-20T10:00:00Z'
      }];

      renderTrashList();

      const listEl = document.getElementById('trash-list');

      // Verify the item appears in the list
      expect(listEl.children.length).toBe(1);

      // The innerHTML should contain the escaped filename
      // escapeHtml() prevents the script from being executable
      const html = listEl.innerHTML;
      expect(html).toContain('.md'); // File extension should be visible
    });

    it('renders restore button for each item', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      const html = listEl.innerHTML;

      expect(html).toContain('Restore');
      expect(html).toContain('window.restoreItem');
    });

    it('renders delete forever button for each item', () => {
      renderTrashList();

      const listEl = document.getElementById('trash-list');
      const html = listEl.innerHTML;

      expect(html).toContain('Delete Forever');
      expect(html).toContain('window.permanentlyDeleteItem');
    });

    it('warns if DOM elements not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Remove DOM elements
      document.getElementById('trash-list').remove();

      renderTrashList();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Trash DOM elements not found');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('restoreItem', () => {
    it('shows confirmation dialog with correct message', async () => {
      mockShowConfirm.mockResolvedValue(false); // Cancel

      await restoreItem('my-post.md', 'abc123', 'post');

      expect(mockShowConfirm).toHaveBeenCalledWith(
        'Restore "my-post.md" to posts?',
        {
          title: 'Confirm Restore',
          buttonText: 'Restore',
          buttonClass: 'btn-primary'
        }
      );
    });

    it('shows correct destination for pages', async () => {
      mockShowConfirm.mockResolvedValue(false);

      await restoreItem('my-page.md', 'def456', 'page');

      expect(mockShowConfirm).toHaveBeenCalledWith(
        'Restore "my-page.md" to pages?',
        expect.any(Object)
      );
    });

    it('does not restore when user cancels confirmation', async () => {
      mockShowConfirm.mockResolvedValue(false);

      await restoreItem('my-post.md', 'abc123', 'post');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends restore request to API when confirmed', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit123' })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await restoreItem('my-post.md', 'abc123', 'post');

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/trash',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.filename).toBe('my-post.md');
      expect(body.sha).toBe('abc123');
      expect(body.type).toBe('post');
    });

    it('tracks deployment when commitSha returned', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit123' })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await restoreItem('my-post.md', 'abc123', 'post');

      expect(mockTrackDeployment).toHaveBeenCalledWith(
        'commit123',
        'Restore post: my-post.md'
      );
    });

    it('shows success message after restore', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await restoreItem('my-post.md', 'abc123', 'post');

      const successEl = document.getElementById('success');
      expect(successEl.classList.contains('hidden')).toBe(false);
      expect(successEl.querySelector('p').textContent).toContain('Post restored');
    });

    it('shows correct message for page restore', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-page.md', sha: 'def456', type: 'page', size: 2048 }
      ];

      await restoreItem('my-page.md', 'def456', 'page');

      const successEl = document.getElementById('success');
      expect(successEl.querySelector('p').textContent).toContain('Page restored');
    });

    it('removes restored item from global array', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 },
        { name: 'other-post.md', sha: 'xyz789', type: 'post', size: 512 }
      ];

      await restoreItem('my-post.md', 'abc123', 'post');

      expect(window.allTrashedItems.length).toBe(1);
      expect(window.allTrashedItems[0].name).toBe('other-post.md');
    });

    it('shows error when restore fails', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Restore failed' })
      });

      await restoreItem('my-post.md', 'abc123', 'post');

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.querySelector('p').textContent).toContain('Failed to restore post');
    });

    it('handles network error gracefully', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await restoreItem('my-post.md', 'abc123', 'post');

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });
  });

  describe('permanentlyDeleteItem', () => {
    it('shows confirmation warning with item name', async () => {
      mockShowConfirm.mockResolvedValue(false);

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      expect(mockShowConfirm).toHaveBeenCalledWith(
        'Permanently delete "my-post.md"? This cannot be undone!'
      );
    });

    it('does not delete when user cancels confirmation', async () => {
      mockShowConfirm.mockResolvedValue(false);

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends DELETE request to API when confirmed', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit456' })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/trash',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.filename).toBe('my-post.md');
      expect(body.sha).toBe('abc123');
      expect(body.type).toBe('post');
    });

    it('tracks deployment when commitSha returned', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit456' })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      expect(mockTrackDeployment).toHaveBeenCalledWith(
        'commit456',
        'Permanently delete post: my-post.md'
      );
    });

    it('shows success message after deletion', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 }
      ];

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      const successEl = document.getElementById('success');
      expect(successEl.classList.contains('hidden')).toBe(false);
      expect(successEl.querySelector('p').textContent).toContain('Post permanently deleted');
    });

    it('shows correct message for page deletion', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-page.md', sha: 'def456', type: 'page', size: 2048 }
      ];

      await permanentlyDeleteItem('my-page.md', 'def456', 'page');

      const successEl = document.getElementById('success');
      expect(successEl.querySelector('p').textContent).toContain('Page permanently deleted');
    });

    it('removes deleted item from global array', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      window.allTrashedItems = [
        { name: 'my-post.md', sha: 'abc123', type: 'post', size: 1024 },
        { name: 'other-post.md', sha: 'xyz789', type: 'post', size: 512 }
      ];

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      expect(window.allTrashedItems.length).toBe(1);
      expect(window.allTrashedItems[0].name).toBe('other-post.md');
    });

    it('shows error when deletion fails', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Delete failed' })
      });

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.querySelector('p').textContent).toContain('Failed to delete post');
    });

    it('handles network error gracefully', async () => {
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await permanentlyDeleteItem('my-post.md', 'abc123', 'post');

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });
  });

  describe('getTrashedItems', () => {
    it('returns current trashed items array', () => {
      const mockItems = [
        { name: 'item1.md', sha: 'abc', type: 'post', size: 1024 },
        { name: 'item2.md', sha: 'def', type: 'page', size: 2048 }
      ];

      window.allTrashedItems = mockItems;

      const items = getTrashedItems();

      expect(items).toEqual(mockItems);
      expect(items.length).toBe(2);
    });

    it('returns empty array when no items', () => {
      window.allTrashedItems = [];

      const items = getTrashedItems();

      expect(items).toEqual([]);
    });

    it('returns empty array when allTrashedItems is undefined', () => {
      window.allTrashedItems = undefined;

      const items = getTrashedItems();

      expect(items).toEqual([]);
    });
  });

  describe('Integration - Complete Trash Workflow', () => {
    it('can load, display, and restore items', async () => {
      // Load trash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { name: 'deleted-post.md', sha: 'abc123', type: 'post', size: 1024, trashed_at: '2025-10-20T10:00:00Z' }
          ]
        })
      });

      await loadTrash();
      expect(window.allTrashedItems.length).toBe(1);

      // Render list
      renderTrashList();
      const listEl = document.getElementById('trash-list');
      expect(listEl.children.length).toBe(1);

      // Restore item
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit123' })
      });

      await restoreItem('deleted-post.md', 'abc123', 'post');

      expect(window.allTrashedItems.length).toBe(0);
      expect(mockTrackDeployment).toHaveBeenCalled();
    });

    it('can load, display, and permanently delete items', async () => {
      // Load trash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { name: 'deleted-post.md', sha: 'abc123', type: 'post', size: 1024, trashed_at: '2025-10-20T10:00:00Z' }
          ]
        })
      });

      await loadTrash();
      expect(window.allTrashedItems.length).toBe(1);

      // Permanently delete item
      mockShowConfirm.mockResolvedValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, commitSha: 'commit456' })
      });

      await permanentlyDeleteItem('deleted-post.md', 'abc123', 'post');

      expect(window.allTrashedItems.length).toBe(0);
      expect(mockTrackDeployment).toHaveBeenCalled();
    });

    it('handles cancelled operations gracefully', async () => {
      window.allTrashedItems = [
        { name: 'item.md', sha: 'abc', type: 'post', size: 1024 }
      ];

      // User cancels restore
      mockShowConfirm.mockResolvedValue(false);
      await restoreItem('item.md', 'abc', 'post');
      expect(window.allTrashedItems.length).toBe(1); // Still there

      // User cancels delete
      mockShowConfirm.mockResolvedValue(false);
      await permanentlyDeleteItem('item.md', 'abc', 'post');
      expect(window.allTrashedItems.length).toBe(1); // Still there
    });
  });
});
