/**
 * Image Chooser Module
 *
 * Custom modal-based image chooser that integrates with the Media Library.
 * Provides a consistent UI for selecting featured images in posts/pages.
 *
 * Features:
 * - Modal overlay with media grid
 * - Search and filter capabilities
 * - Pagination support
 * - Callback system for image selection
 * - Consistent styling with admin interface
 *
 * Dependencies:
 * - core/utils.js for escapeHtml()
 * - ui/notifications.js for showError()
 * - Global API_BASE constant
 *
 * @module modules/image-chooser
 */

import { escapeHtml } from '../core/utils.js';
import { showError } from '../ui/notifications.js';

let chooserCallback = null;
let chooserMedia = [];
let chooserPage = 1;
const chooserPerPage = 12;

/**
 * Opens the custom image chooser modal
 *
 * Displays a modal with media library grid for selecting an image.
 * Calls the provided callback with the selected image URL.
 *
 * @param {Function} callback - Function to call with selected image URL
 *
 * @example
 * import { openImageChooser } from './modules/image-chooser.js';
 * openImageChooser((url) => {
 *   document.getElementById('image-field').value = url;
 * });
 */
export async function openImageChooser(callback) {
  chooserCallback = callback;
  chooserPage = 1;

  // Load media if not already loaded
  try {
    const response = await fetch(`${window.API_BASE}/media`);
    if (!response.ok) throw new Error('Failed to load media');

    const data = await response.json();
    chooserMedia = data.resources || [];

    // Create and show modal
    createChooserModal();
    renderChooserGrid();
  } catch (error) {
    showError('Failed to load media: ' + error.message);
  }
}

/**
 * Creates the image chooser modal HTML
 *
 * @private
 */
function createChooserModal() {
  let modal = document.getElementById('image-chooser-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-chooser-modal';
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[10000]';
    modal.onclick = (e) => {
      if (e.target === modal) closeImageChooser();
    };

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Choose Featured Image</h3>
          <button
            onclick="window.closeImageChooser()"
            class="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <i class="fas fa-times fa-lg"></i>
          </button>
        </div>

        <!-- Search -->
        <div class="p-4 border-b border-gray-200">
          <input
            type="text"
            id="chooser-search"
            placeholder="Search images..."
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            oninput="window.filterChooserMedia()"
          />
        </div>

        <!-- Grid -->
        <div class="flex-1 overflow-y-auto p-6">
          <div id="chooser-grid" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <!-- Images will be inserted here -->
          </div>
          <div id="chooser-empty" class="hidden text-center py-12 text-gray-500">
            <i class="fas fa-image fa-3x mb-4 text-gray-300"></i>
            <p>No images found</p>
          </div>
        </div>

        <!-- Pagination -->
        <div id="chooser-pagination" class="hidden p-4 border-t border-gray-200 flex justify-between items-center">
          <button
            id="chooser-prev"
            onclick="window.changeChooserPage(-1)"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Previous
          </button>
          <span class="text-sm text-gray-600">
            Page <span id="chooser-current-page">1</span> of <span id="chooser-total-pages">1</span>
          </span>
          <button
            id="chooser-next"
            onclick="window.changeChooserPage(1)"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  modal.classList.remove('hidden');

  // ESC key handler
  document.addEventListener('keydown', handleChooserEscape);
}

/**
 * Renders the image chooser grid
 *
 * @private
 */
function renderChooserGrid() {
  const grid = document.getElementById('chooser-grid');
  const emptyEl = document.getElementById('chooser-empty');
  const search = document.getElementById('chooser-search')?.value.toLowerCase() || '';

  // Filter media
  let filtered = chooserMedia.filter(media => {
    return media.resource_type === 'image' &&
           (!search || media.public_id.toLowerCase().includes(search));
  });

  // Sort by most recent
  filtered = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Pagination
  const totalPages = Math.ceil(filtered.length / chooserPerPage);
  const startIndex = (chooserPage - 1) * chooserPerPage;
  const paginatedMedia = filtered.slice(startIndex, startIndex + chooserPerPage);

  // Show/hide empty state
  if (filtered.length === 0) {
    if (grid) grid.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    const paginationEl = document.getElementById('chooser-pagination');
    if (paginationEl) paginationEl.classList.add('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  // Render grid
  if (grid) {
    grid.innerHTML = paginatedMedia.map(media => {
      const thumbnailUrl = media.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/');
      const filename = media.public_id.split('/').pop();

      return `
        <button
          onclick="window.selectChooserImage('${escapeHtml(media.secure_url)}')"
          class="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          title="${escapeHtml(filename)}"
        >
          <img
            src="${thumbnailUrl}"
            alt="${escapeHtml(filename)}"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-teal-500 bg-opacity-0 group-hover:bg-opacity-10 transition flex items-center justify-center">
            <i class="fas fa-check-circle text-white text-2xl opacity-0 group-hover:opacity-100 transition"></i>
          </div>
        </button>
      `;
    }).join('');
  }

  // Update pagination
  updateChooserPagination(totalPages);
}

/**
 * Updates chooser pagination UI
 *
 * @param {number} totalPages - Total number of pages
 * @private
 */
function updateChooserPagination(totalPages) {
  const paginationEl = document.getElementById('chooser-pagination');
  const prevBtn = document.getElementById('chooser-prev');
  const nextBtn = document.getElementById('chooser-next');
  const currentPageEl = document.getElementById('chooser-current-page');
  const totalPagesEl = document.getElementById('chooser-total-pages');

  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }

  paginationEl.classList.remove('hidden');
  if (currentPageEl) currentPageEl.textContent = chooserPage;
  if (totalPagesEl) totalPagesEl.textContent = totalPages;
  if (prevBtn) prevBtn.disabled = chooserPage === 1;
  if (nextBtn) nextBtn.disabled = chooserPage === totalPages;
}

/**
 * Changes chooser page
 *
 * @param {number} delta - Page change delta
 */
export function changeChooserPage(delta) {
  chooserPage += delta;
  renderChooserGrid();
}

/**
 * Filters chooser media by search
 */
export function filterChooserMedia() {
  chooserPage = 1;
  renderChooserGrid();
}

/**
 * Selects an image from the chooser
 *
 * @param {string} url - Image URL
 */
export function selectChooserImage(url) {
  if (chooserCallback) {
    chooserCallback(url);
  }
  closeImageChooser();
}

/**
 * Closes the image chooser modal
 */
export function closeImageChooser() {
  const modal = document.getElementById('image-chooser-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  document.removeEventListener('keydown', handleChooserEscape);
  chooserCallback = null;
}

/**
 * Handles ESC key to close chooser
 *
 * @param {KeyboardEvent} e - Keyboard event
 * @private
 */
function handleChooserEscape(e) {
  if (e.key === 'Escape') {
    closeImageChooser();
  }
}
