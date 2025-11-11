/**
 * Recently Published Module
 *
 * Dashboard widget showing recently modified posts and pages
 *
 * Features:
 * - Fetches recently published content from Netlify Function
 * - Displays in dashboard table with edit links
 * - Shows relative timestamps
 * - Handles loading and error states
 *
 * Dependencies:
 * - core/utils.js (escapeHtml)
 * - modules/deployments.js (getRelativeTime)
 * - Global constants: API_BASE
 *
 * @version 1.0.0
 */

import { escapeHtml } from '../core/utils.js';
import { getRelativeTime } from './deployments.js';
import logger from '../core/logger.js';

/**
 * Updates the Recently Published dashboard card
 *
 * Fetches and displays recently published posts and pages.
 * Shows loading state while fetching, and error state on failure.
 *
 * @returns {Promise<void>}
 */
export async function updateRecentlyPublished() {
  const loadingEl = document.getElementById('recently-published-loading');
  const contentEl = document.getElementById('recently-published-content');
  const tbody = document.getElementById('recently-published-tbody');

  if (!loadingEl || !contentEl || !tbody) return; // Not on dashboard

  try {
    // Show loading state
    loadingEl.classList.remove('d-none');
    contentEl.classList.add('d-none');

    // Fetch recently published content from Netlify Function
    const response = await fetch(`${API_BASE}/recently-published`);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const recentFiles = await response.json();

    // Render table rows
    tbody.innerHTML = '';

    if (!recentFiles || recentFiles.length === 0) {
      contentEl.classList.remove('d-none');
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="text-center py-4 text-muted">
            <i class="fas fa-file-alt fs-3 mb-2 text-secondary d-block"></i>
            <span>No content yet</span>
          </td>
        </tr>
      `;
      loadingEl.classList.add('d-none');
      return;
    }

    recentFiles.forEach((file, index) => {
      const relativeTime = getRelativeTime(new Date(file.lastModified));
      const typeIcon = file.type === 'Post' ? 'fa-newspaper' : 'fa-file-alt';
      const rowBg = index % 2 === 0 ? '' : 'table-light';

      const row = document.createElement('tr');
      row.className = rowBg;
      row.innerHTML = `
        <td class="small">
          <a href="/admin/${file.type.toLowerCase()}s/edit.html?file=${encodeURIComponent(file.name)}" class="text-decoration-none text-dark d-flex align-items-center gap-2">
            <i class="fas ${typeIcon} text-muted small"></i>
            <span class="fw-normal">${escapeHtml(file.title)}</span>
          </a>
        </td>
        <td class="text-muted text-end small fw-normal">${relativeTime}</td>
      `;
      tbody.appendChild(row);
    });

    // Hide loading, show content
    loadingEl.classList.add('d-none');
    contentEl.classList.remove('d-none');

  } catch (error) {
    logger.error('Failed to load recently published:', error);
    loadingEl.classList.add('d-none');
    contentEl.classList.remove('d-none');
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-triangle fs-3 mb-2 d-block"></i>
          <span>Failed to load recently published content</span>
        </td>
      </tr>
    `;
  }
}
