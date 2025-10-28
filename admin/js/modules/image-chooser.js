/**
 * Image Chooser Module
 *
 * Bootstrap modal-based image chooser that integrates with the Media Library.
 * Provides a consistent UI for selecting featured images in posts/pages.
 *
 * Features:
 * - Bootstrap modal with media grid
 * - Search and filter capabilities
 * - Pagination support
 * - Callback system for image selection
 * - Consistent styling with admin interface
 *
 * Dependencies:
 * - core/utils.js for escapeHtml()
 * - ui/notifications.js for showError()
 * - Global API_BASE constant
 * - External: Bootstrap 5 (for modal functionality)
 *
 * @module modules/image-chooser
 */

import { escapeHtml } from '../core/utils.js';
import { showError } from '../ui/notifications.js';

let chooserCallback = null;
let chooserMedia = [];
let chooserPage = 1;
const chooserPerPage = 12;
let chooserModalInstance = null;

/**
 * Opens the image chooser modal using Bootstrap
 *
 * Displays a Bootstrap modal with media library grid for selecting an image.
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

    // Clear search input
    const searchInput = document.getElementById('chooser-search');
    if (searchInput) {
      searchInput.value = '';
    }

    // Render grid and show modal
    renderChooserGrid();

    const modalElement = document.getElementById('imageChooserModal');
    if (modalElement) {
      if (!chooserModalInstance) {
        chooserModalInstance = new bootstrap.Modal(modalElement);
      }
      chooserModalInstance.show();
    }
  } catch (error) {
    showError('Failed to load media: ' + error.message);
  }
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
    if (emptyEl) emptyEl.classList.remove('d-none');
    const paginationEl = document.getElementById('chooser-pagination');
    if (paginationEl) paginationEl.classList.add('d-none');
    return;
  }

  if (emptyEl) emptyEl.classList.add('d-none');

  // Helper function to escape strings for JavaScript context (onclick attributes)
  const escapeJs = (str) => String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

  // Render grid
  if (grid) {
    grid.innerHTML = paginatedMedia.map(media => {
      const thumbnailUrl = media.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/');
      const filename = media.public_id.split('/').pop();

      return `
        <div class="col">
          <button
            onclick="window.selectChooserImage('${escapeJs(media.secure_url)}');"
            class="chooser-image-btn position-relative bg-light rounded overflow-hidden border border-2 w-100 p-0"
            class="ratio ratio-1x1"
            title="${escapeHtml(filename)}"
          >
            <img
              src="${thumbnailUrl}"
              alt="${escapeHtml(filename)}"
              class="w-100 h-100 object-fit-cover"
              loading="lazy"
            />
            <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center chooser-image-overlay">
              <i class="fas fa-check-circle text-white fs-2 opacity-0"></i>
            </div>
          </button>
        </div>
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
    paginationEl.classList.add('d-none');
    return;
  }

  paginationEl.classList.remove('d-none');
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
 * Calls the callback with the selected image URL and closes the modal using Bootstrap.
 *
 * @param {string} url - Image URL
 */
export function selectChooserImage(url) {
  if (chooserCallback) {
    chooserCallback(url);
  }

  // Close modal using Bootstrap
  if (chooserModalInstance) {
    chooserModalInstance.hide();
  }

  chooserCallback = null;
}
