/**
 * Media Module
 *
 * Manages Cloudinary media library with browsing, uploading, and pagination.
 * Provides media grid rendering, URL copying, and full-size preview functionality.
 *
 * Features:
 * - Load and display media files from Cloudinary
 * - Paginated grid view with thumbnails
 * - Search and filter media (all, images only, recent uploads)
 * - Copy media URLs to clipboard
 * - View full-size images in modal
 * - Upload new images via Cloudinary widget
 * - Automatic reload after upload
 *
 * Dependencies:
 * - core/utils.js for escapeHtml() and debounce()
 * - ui/notifications.js for showError() and showSuccess()
 * - Global API_BASE constant
 * - Global state: allMedia, currentMediaPage, mediaPerPage, cloudinaryUploadWidget
 * - Global handleImageModalEscape() function (shared with other modules)
 * - External: Cloudinary Upload Widget library
 *
 * @module modules/media
 */

import { escapeHtml, debounce } from '../core/utils.js';
import { showError, showSuccess } from '../ui/notifications.js';

/**
 * Access global media state from app.js
 * These are shared between the module and app.js for state management
 */

/**
 * Loads media files from Cloudinary
 *
 * Fetches all media resources from Cloudinary API and renders the media grid.
 * Hides loading indicator when complete.
 *
 * @throws {Error} If media load fails
 *
 * @example
 * import { loadMedia } from './modules/media.js';
 * await loadMedia();
 */
export async function loadMedia() {
  try {
    const response = await fetch(`${window.API_BASE}/media`);
    if (!response.ok) throw new Error('Failed to load media');

    const data = await response.json();
    window.allMedia = data.resources || [];

    renderMediaGrid();
  } catch (error) {
    showError('Failed to load media: ' + error.message);
  } finally {
    const loadingEl = document.getElementById('media-loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
  }
}

/**
 * Checks if a media file was recently uploaded
 *
 * Determines if a file was uploaded within the last 7 days.
 *
 * @param {string} createdAt - ISO date string of file creation
 *
 * @returns {boolean} True if uploaded within last 7 days
 *
 * @private
 */
function isRecentUpload(createdAt) {
  const uploadDate = new Date(createdAt);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return uploadDate > weekAgo;
}

/**
 * Renders the media library grid
 *
 * Displays media files in a paginated grid with thumbnails, filenames, and action buttons.
 * Applies search and filter criteria, handles pagination, and shows empty state when needed.
 *
 * @example
 * import { renderMediaGrid } from './modules/media.js';
 * renderMediaGrid();
 */
export function renderMediaGrid() {
  const grid = document.getElementById('media-grid');
  const emptyEl = document.getElementById('media-empty');
  const loadingEl = document.getElementById('media-loading');
  const search = document.getElementById('media-search')?.value.toLowerCase() || '';
  const filter = document.getElementById('media-filter')?.value || 'all';

  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  const allMedia = window.allMedia || [];
  const mediaPerPage = window.mediaPerPage || 20;
  const currentMediaPage = window.currentMediaPage || 1;

  // Filter media
  let filtered = allMedia.filter(media => {
    const matchesSearch = !search || media.public_id.toLowerCase().includes(search);
    const matchesFilter = filter === 'all' ||
      (filter === 'images' && media.resource_type === 'image') ||
      (filter === 'recent' && isRecentUpload(media.created_at));
    return matchesSearch && matchesFilter;
  });

  // Sort by most recent first
  filtered = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Pagination
  const totalMedia = filtered.length;
  const totalPages = Math.ceil(totalMedia / mediaPerPage);
  const startIndex = (currentMediaPage - 1) * mediaPerPage;
  const endIndex = Math.min(startIndex + mediaPerPage, totalMedia);
  const paginatedMedia = filtered.slice(startIndex, endIndex);

  // Show/hide empty state
  if (filtered.length === 0) {
    if (grid) grid.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    const paginationEl = document.getElementById('media-pagination');
    if (paginationEl) paginationEl.classList.add('hidden');
    return;
  }

  if (emptyEl) {
    emptyEl.classList.add('hidden');
  }

  // Render media grid
  if (grid) {
    grid.innerHTML = paginatedMedia.map(media => {
      const thumbnailUrl = media.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/');
      const filename = media.public_id.split('/').pop();
      const sizeKB = (media.bytes / 1024).toFixed(1);

      return `
      <div class="media-item group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-teal-500 transition shadow-sm hover:shadow-md">
        <div class="aspect-square relative bg-gray-100">
          <img
            src="${thumbnailUrl}"
            alt="${escapeHtml(filename)}"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onclick="event.stopPropagation(); window.copyMediaUrl('${escapeHtml(media.secure_url)}', event)"
                class="bg-white text-gray-700 p-3 rounded-lg hover:bg-teal-50 hover:text-teal-600 shadow-lg transition-all transform hover:scale-105"
                title="Copy URL to clipboard"
                aria-label="Copy URL"
              >
                <i class="fas fa-copy"></i>
              </button>
              <button
                onclick="event.stopPropagation(); window.viewMediaFull('${escapeHtml(media.secure_url)}')"
                class="bg-white text-gray-700 p-3 rounded-lg hover:bg-teal-50 hover:text-teal-600 shadow-lg transition-all transform hover:scale-105"
                title="View full size image"
                aria-label="View full size"
              >
                <i class="fas fa-search-plus"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="p-3">
          <p class="text-sm font-medium text-gray-900 truncate mb-1" title="${escapeHtml(filename)}">
            ${escapeHtml(filename)}
          </p>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>${media.width} × ${media.height}</span>
            <span>${sizeKB} KB</span>
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  // Update pagination
  updateMediaPagination(totalPages);
}

/**
 * Updates media pagination UI
 *
 * Updates page number display and enables/disables prev/next buttons.
 * Hides pagination if only one page exists.
 *
 * @param {number} totalPages - Total number of pages
 *
 * @example
 * import { updateMediaPagination } from './modules/media.js';
 * updateMediaPagination(5);
 */
export function updateMediaPagination(totalPages) {
  const paginationEl = document.getElementById('media-pagination');
  const prevBtn = document.getElementById('media-prev-btn');
  const nextBtn = document.getElementById('media-next-btn');
  const currentPageEl = document.getElementById('media-current-page');
  const totalPagesEl = document.getElementById('media-total-pages');

  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }

  const currentMediaPage = window.currentMediaPage || 1;

  paginationEl.classList.remove('hidden');
  if (currentPageEl) currentPageEl.textContent = currentMediaPage;
  if (totalPagesEl) totalPagesEl.textContent = totalPages;
  if (prevBtn) prevBtn.disabled = currentMediaPage === 1;
  if (nextBtn) nextBtn.disabled = currentMediaPage === totalPages;
}

/**
 * Changes the current page in media pagination
 *
 * Updates page number and re-renders the media grid.
 * Scrolls to top of media section for better UX.
 *
 * @param {number} delta - Page change delta (+1 for next, -1 for previous)
 *
 * @example
 * import { changeMediaPage } from './modules/media.js';
 * changeMediaPage(1); // Next page
 * changeMediaPage(-1); // Previous page
 */
export function changeMediaPage(delta) {
  window.currentMediaPage = (window.currentMediaPage || 1) + delta;
  renderMediaGrid();

  const section = document.getElementById('section-media');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Filters media by search term
 *
 * Resets to first page and re-renders media grid with search filter applied.
 * Triggered by search input or filter dropdown changes.
 *
 * @example
 * import { filterMedia } from './modules/media.js';
 * filterMedia();
 */
export function filterMedia() {
  window.currentMediaPage = 1;
  renderMediaGrid();
}

/**
 * Debounced version of filterMedia for search input
 *
 * Debounces the filterMedia function with 300ms delay to avoid excessive re-renders
 * while user is typing in the search box.
 *
 * @example
 * import { debouncedFilterMedia } from './modules/media.js';
 * document.getElementById('media-search').addEventListener('input', debouncedFilterMedia);
 */
export const debouncedFilterMedia = debounce(filterMedia, 300);

/**
 * Copies a media URL to clipboard
 *
 * Uses the Clipboard API to copy the URL and shows a contextual tooltip
 * near the clicked button instead of a top toast notification.
 *
 * @param {string} url - URL to copy to clipboard
 * @param {Event} event - Click event from the button
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { copyMediaUrl } from './modules/media.js';
 * await copyMediaUrl('https://res.cloudinary.com/.../image.jpg', event);
 */
export async function copyMediaUrl(url, event) {
  try {
    await navigator.clipboard.writeText(url);

    // Show contextual tooltip near the button
    const button = event?.currentTarget || event?.target;
    if (button) {
      showCopyTooltip(button);
    } else {
      // Fallback to toast if no button reference
      showSuccess('Image URL copied to clipboard!');
    }
  } catch (error) {
    showError('Failed to copy URL: ' + error.message);
  }
}

/**
 * Shows a temporary tooltip near the copy button
 *
 * Creates and displays a small tooltip that appears near the clicked button
 * and automatically fades out after 2 seconds.
 *
 * @param {HTMLElement} button - The button element that was clicked
 *
 * @private
 */
function showCopyTooltip(button) {
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'absolute z-50 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded shadow-lg pointer-events-none';
  tooltip.textContent = 'Copied!';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 0.2s';

  // Position tooltip above the button
  const parent = button.closest('.media-item');
  if (parent) {
    parent.style.position = 'relative';
    parent.appendChild(tooltip);

    // Center tooltip horizontally and position above button
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';

    // Fade in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });

    // Fade out and remove after 2 seconds
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 200);
    }, 2000);
  }
}

/**
 * Opens media file in full-size modal
 *
 * Displays the full-size media file in an image modal overlay.
 * Attaches keyboard escape handler for closing the modal.
 *
 * @param {string} url - URL of media file
 *
 * @example
 * import { viewMediaFull } from './modules/media.js';
 * viewMediaFull('https://res.cloudinary.com/.../image.jpg');
 */
export function viewMediaFull(url) {
  const modalOverlay = document.getElementById('image-modal-overlay');
  const modalImg = document.getElementById('image-modal-img');

  if (modalImg) {
    modalImg.src = url;
  }

  if (modalOverlay) {
    modalOverlay.classList.remove('hidden');
  }

  // Close on Escape key (uses shared handler from app.js)
  if (window.handleImageModalEscape) {
    document.addEventListener('keydown', window.handleImageModalEscape);
  }
}

/**
 * Opens the Cloudinary upload widget
 *
 * Shows the Cloudinary upload widget for uploading new media files.
 * Refreshes the media grid after successful upload.
 * Creates the widget instance on first use.
 *
 * @example
 * import { openCloudinaryUpload } from './modules/media.js';
 * openCloudinaryUpload();
 */
export function openCloudinaryUpload() {
  // Check if Cloudinary library is loaded
  if (typeof cloudinary === 'undefined') {
    showError('Cloudinary library is still loading. Please try again in a moment.');
    return;
  }

  // Create widget if not already created
  if (!window.cloudinaryUploadWidget) {
    window.cloudinaryUploadWidget = cloudinary.createUploadWidget({
      cloudName: 'circleseven',
      uploadPreset: 'ml_default',
      sources: ['local', 'url', 'camera'],
      multiple: true,
      maxFiles: 10,
      folder: '',
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    }, (error, result) => {
      if (!error && result && result.event === 'success') {
        showSuccess('Image uploaded successfully!');
        // Reload media library
        loadMedia();
      }
      if (error) {
        showError('Upload failed: ' + error.message);
      }
    });
  }

  window.cloudinaryUploadWidget.open();
}
