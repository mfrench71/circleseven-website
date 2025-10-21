/**
 * Trash Module
 *
 * Manages soft-deleted posts and pages with restore and permanent delete capabilities.
 * Provides trash list rendering, item restoration, and permanent deletion.
 *
 * Features:
 * - Load and display trashed items
 * - Restore items to posts or pages
 * - Permanently delete items
 * - Track deployments for restore/delete operations
 * - Reload related lists after operations
 *
 * Dependencies:
 * - core/utils.js for escapeHtml()
 * - ui/notifications.js for showError() and showSuccess()
 * - Global API_BASE constant
 * - Global showConfirm() function
 * - Global trackDeployment() function
 * - Global loadPosts() and loadPages() functions
 *
 * @module modules/trash
 */

import { escapeHtml } from '../core/utils.js';
import { showError, showSuccess } from '../ui/notifications.js';

/**
 * Access global allTrashedItems array from app.js
 * This is shared state between the module and app.js
 */

/**
 * Loads deleted items from the trash
 *
 * Fetches trashed posts and pages from the backend and renders the trash list.
 * Hides the loading indicator when complete.
 *
 * @throws {Error} If trash load fails
 *
 * @example
 * import { loadTrash } from './modules/trash.js';
 * await loadTrash();
 */
export async function loadTrash() {
  try {
    const response = await fetch(`${window.API_BASE}/trash`);
    if (!response.ok) throw new Error('Failed to load trash');

    const data = await response.json();
    window.allTrashedItems = data.items || [];

    renderTrashList();
  } catch (error) {
    showError('Failed to load bin: ' + error.message);
  } finally {
    const loadingEl = document.getElementById('trash-loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
  }
}

/**
 * Renders the trash list with restore and permanent delete actions
 *
 * Displays all trashed items with their type, date, and action buttons.
 * Shows empty state message when no items are in trash.
 *
 * @example
 * import { renderTrashList } from './modules/trash.js';
 * renderTrashList();
 */
export function renderTrashList() {
  const listEl = document.getElementById('trash-list');
  const emptyEl = document.getElementById('trash-empty');

  if (!listEl || !emptyEl) {
    console.warn('Trash DOM elements not found');
    return;
  }

  const allTrashedItems = window.allTrashedItems || [];

  if (allTrashedItems.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = allTrashedItems.map(item => {
    const typeLabel = item.type === 'page' ? 'Page' : 'Post';
    const typeBadgeColor = item.type === 'page' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';

    // Format trashed_at timestamp
    let trashedAtDisplay = '';
    if (item.trashed_at) {
      const trashedDate = new Date(item.trashed_at);
      trashedAtDisplay = trashedDate.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return `
    <li class="flex items-center gap-4 p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
      <div class="flex-1">
        <div class="font-medium">${escapeHtml(item.name)}</div>
        ${trashedAtDisplay ? `<div class="text-xs text-gray-500">Deleted: ${trashedAtDisplay}</div>` : ''}
      </div>
      <span class="px-2 py-0.5 text-xs font-medium rounded ${typeBadgeColor}">${typeLabel}</span>
      <span class="text-xs text-gray-500">${(item.size / 1024).toFixed(1)} KB</span>
      <button
        onclick="window.restoreItem('${escapeHtml(item.name)}', '${escapeHtml(item.sha)}', '${escapeHtml(item.type)}')"
        class="btn-primary-sm"
        title="Restore item from bin"
      >
        Restore
      </button>
      <button
        onclick="window.permanentlyDeleteItem('${escapeHtml(item.name)}', '${escapeHtml(item.sha)}', '${escapeHtml(item.type)}')"
        class="btn-danger-sm"
        title="Permanently delete item"
      >
        Delete Forever
      </button>
    </li>
  `;
  }).join('');
}

/**
 * Restores a deleted item from trash with deployment tracking
 *
 * Shows confirmation dialog, sends restore request to backend, tracks deployment,
 * and refreshes the trash list. Reloads posts or pages list if applicable.
 *
 * @param {string} filename - Name of the file to restore
 * @param {string} sha - Git SHA of the deleted file
 * @param {string} type - Type of item ("post" or "page")
 *
 * @throws {Error} If restore fails
 *
 * @example
 * import { restoreItem } from './modules/trash.js';
 * await restoreItem('my-post.md', 'abc123', 'post');
 */
export async function restoreItem(filename, sha, type) {
  const itemType = type === 'page' ? 'page' : 'post';
  const destination = type === 'page' ? 'pages' : 'posts';

  const confirmed = await window.showConfirm(`Restore "${filename}" to ${destination}?`, {
    title: 'Confirm Restore',
    buttonText: 'Restore',
    buttonClass: 'btn-primary'
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`${window.API_BASE}/trash`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha,
        type: type
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to restore ${itemType}`);
    }

    const result = await response.json();

    // Track deployment if commitSha is returned
    if (result.commitSha && window.trackDeployment) {
      window.trackDeployment(result.commitSha, `Restore ${itemType}: ${filename}`);
    }

    showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored! Changes publishing...`);

    // Remove from global array (optimistic update)
    window.allTrashedItems = window.allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list immediately
    renderTrashList();

    // Note: We don't reload posts/pages here to avoid the delay
    // The deployment tracking header shows progress
    // Posts/pages will refresh when user switches sections
  } catch (error) {
    showError(`Failed to restore ${itemType}: ` + error.message);
  }
}

/**
 * Permanently deletes an item from trash
 *
 * Shows confirmation warning, sends permanent delete request to backend,
 * tracks deployment, and refreshes the trash list.
 *
 * Warning: This action cannot be undone.
 *
 * @param {string} filename - Name of the file to delete
 * @param {string} sha - Git SHA of the file
 * @param {string} type - Type of item ("post" or "page")
 *
 * @throws {Error} If permanent deletion fails
 *
 * @example
 * import { permanentlyDeleteItem } from './modules/trash.js';
 * await permanentlyDeleteItem('old-post.md', 'abc123', 'post');
 */
export async function permanentlyDeleteItem(filename, sha, type) {
  const itemType = type === 'page' ? 'page' : 'post';

  const confirmed = await window.showConfirm(`Permanently delete "${filename}"? This cannot be undone!`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${window.API_BASE}/trash`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha,
        type: type
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete ${itemType}`);
    }

    const data = await response.json();

    if (data.commitSha && window.trackDeployment) {
      window.trackDeployment(data.commitSha, `Permanently delete ${itemType}: ${filename}`);
    }

    showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} permanently deleted! Changes publishing...`);

    // Remove from global array (optimistic update)
    window.allTrashedItems = window.allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list immediately
    renderTrashList();
  } catch (error) {
    showError(`Failed to delete ${itemType}: ` + error.message);
  }
}

/**
 * Gets the current trashed items array
 *
 * Provides read-only access to the trashed items for testing or inspection.
 *
 * @returns {Array<Object>} Array of trashed items
 *
 * @example
 * import { getTrashedItems } from './modules/trash.js';
 * const items = getTrashedItems();
 * console.log(`${items.length} items in trash`);
 */
export function getTrashedItems() {
  return window.allTrashedItems || [];
}
