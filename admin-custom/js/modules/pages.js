/**
 * Pages Module
 *
 * Manages site pages with CRUD operations, markdown editing, and permalink management.
 * Provides page list rendering, editor functionality, and protected page support.
 *
 * Features:
 * - Load and display all pages
 * - Search and filter pages
 * - Create, edit, and delete pages
 * - Markdown editor integration (EasyMDE)
 * - Auto-populate permalinks from titles
 * - Protected page support
 * - Soft delete (move to trash)
 * - Deployment tracking
 * - Unsaved changes detection
 *
 * Dependencies:
 * - core/utils.js for escapeHtml() and debounce()
 * - ui/notifications.js for showError() and showSuccess()
 * - Global API_BASE constant
 * - Global state: allPages, currentPage_pages, pageMarkdownEditor, pageHasUnsavedChanges, permalinkManuallyEdited
 * - Global functions: showConfirm(), trackDeployment(), formatDateForInput()
 * - External: EasyMDE library for markdown editing
 *
 * @module modules/pages
 */

import { escapeHtml, debounce } from '../core/utils.js';
import { showError, showSuccess } from '../ui/notifications.js';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const PAGES_CACHE_KEY = 'admin_pages_cache';

/**
 * Gets cached data if still valid
 */
function getCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * Sets cache data with timestamp
 */
function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

/**
 * Clears pages cache
 */
export function clearPagesCache() {
  localStorage.removeItem(PAGES_CACHE_KEY);
}

/**
 * Access global pages state from app.js
 * These are shared between the module and app.js for state management
 */

/**
 * Loads all pages from the backend
 *
 * Fetches the list of pages with metadata and renders the pages list.
 * Hides loading indicator when complete.
 *
 * @throws {Error} If pages load fails
 *
 * @example
 * import { loadPages } from './modules/pages.js';
 * await loadPages();
 */
export async function loadPages() {
  try {
    // Try to load from cache first
    const cachedPages = getCache(PAGES_CACHE_KEY);
    if (cachedPages) {
      console.log('Loading pages from cache');
      window.allPages = cachedPages;
      renderPagesList();
      document.getElementById('pages-loading').classList.add('hidden');
      return;
    }

    // Cache miss - fetch from API
    console.log('Loading pages from API');
    const response = await fetch(`${window.API_BASE}/pages?metadata=true`);
    if (!response.ok) throw new Error('Failed to load pages');

    const data = await response.json();
    window.allPages = data.pages || [];

    // Cache the results
    setCache(PAGES_CACHE_KEY, window.allPages);

    renderPagesList();
  } catch (error) {
    showError('Failed to load pages: ' + error.message);
  } finally {
    document.getElementById('pages-loading').classList.add('hidden');
  }
}

/**
 * Renders the pages list with search filtering
 *
 * Filters pages by search term and generates HTML table rows with edit/delete actions.
 * Shows empty state when no pages match the search.
 *
 * @example
 * import { renderPagesList } from './modules/pages.js';
 * renderPagesList();
 */
export function renderPagesList() {
  const tbody = document.getElementById('pages-table-body');
  const emptyEl = document.getElementById('pages-empty');
  const search = document.getElementById('pages-search')?.value.toLowerCase() || '';

  const allPages = window.allPages || [];

  // Filter pages by search term
  let filtered = allPages.filter(page => {
    const title = (page.frontmatter?.title || '').toLowerCase();
    const filename = page.name.toLowerCase();
    return title.includes(search) || filename.includes(search);
  });

  // Show/hide empty state
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  // Render table rows
  tbody.innerHTML = filtered.map((page, index) => {
    const title = page.frontmatter?.title || page.name;
    const permalink = page.frontmatter?.permalink || '-';
    const isProtected = page.frontmatter?.protected === true;

    // Protected pages don't show delete link
    const deleteLink = isProtected
      ? ''
      : ` | <span><a href="#" onclick="event.preventDefault(); window.deletePageFromList('${escapeHtml(page.name)}', '${escapeHtml(page.sha)}')" class="text-red-600 hover:text-red-700">Bin</a></span>`;

    // Get date from frontmatter or file metadata
    const datePublished = page.frontmatter?.date || '-';
    const formattedDate = datePublished !== '-'
      ? new Date(datePublished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-';

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm text-gray-500">${index + 1}</td>
        <td class="px-4 py-3 row-with-actions">
          <div class="font-medium text-gray-900">${escapeHtml(title)}</div>
          <div class="row-actions">
            <span><a href="#" onclick="event.preventDefault(); window.editPage('${escapeHtml(page.name)}')">Edit</a></span>${deleteLink} |
            <span><a href="${escapeHtml(permalink)}" target="_blank" rel="noopener">View</a></span>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(permalink)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${formattedDate}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Filters pages based on search input
 *
 * Re-renders the pages list with search filter applied.
 *
 * @example
 * import { filterPages } from './modules/pages.js';
 * filterPages();
 */
export function filterPages() {
  renderPagesList();
}

/**
 * Debounced version of filterPages for search input
 *
 * Debounces the filterPages function with 300ms delay to avoid excessive re-renders
 * while user is typing in the search box.
 *
 * @example
 * import { debouncedFilterPages } from './modules/pages.js';
 * document.getElementById('pages-search').addEventListener('input', debouncedFilterPages);
 */
export const debouncedFilterPages = debounce(filterPages, 300);

/**
 * Initializes the EasyMDE markdown editor for pages
 *
 * Creates the EasyMDE instance for page content editing if it doesn't exist, and sets up change tracking.
 *
 * @example
 * import { initPageMarkdownEditor } from './modules/pages.js';
 * initPageMarkdownEditor();
 */
export function initPageMarkdownEditor() {
  if (!window.pageMarkdownEditor) {
    window.pageMarkdownEditor = new EasyMDE({
      element: document.getElementById('page-content'),
      spellChecker: false,
      autosave: {
        enabled: false
      },
      toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
      status: ['lines', 'words', 'cursor']
    });

    // Track changes in markdown editor
    window.pageMarkdownEditor.codemirror.on('change', () => {
      window.pageHasUnsavedChanges = true;
    });
  }
}

/**
 * Cleans up and destroys the page markdown editor instance
 *
 * Converts the EasyMDE editor back to a textarea and nullifies the instance.
 *
 * @example
 * import { cleanupPageMarkdownEditor } from './modules/pages.js';
 * cleanupPageMarkdownEditor();
 */
export function cleanupPageMarkdownEditor() {
  if (window.pageMarkdownEditor) {
    window.pageMarkdownEditor.toTextArea();
    window.pageMarkdownEditor = null;
  }
}

/**
 * Marks the current page as having unsaved changes
 *
 * Sets the pageHasUnsavedChanges flag.
 *
 * @example
 * import { markPageDirty } from './modules/pages.js';
 * markPageDirty();
 */
export function markPageDirty() {
  window.pageHasUnsavedChanges = true;
}

/**
 * Clears the unsaved changes flag for the current page
 *
 * Resets the pageHasUnsavedChanges flag.
 *
 * @example
 * import { clearPageDirty } from './modules/pages.js';
 * clearPageDirty();
 */
export function clearPageDirty() {
  window.pageHasUnsavedChanges = false;
}

/**
 * Converts text to a URL-friendly slug
 *
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 * Adds leading and trailing slashes for permalink format.
 *
 * @param {string} text - Text to slugify
 *
 * @returns {string} URL-friendly slug with slashes
 *
 * @example
 * import { slugifyPermalink } from './modules/pages.js';
 * const slug = slugifyPermalink('About Us'); // Returns: '/about-us/'
 */
export function slugifyPermalink(text) {
  return '/' + text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Remove leading/trailing hyphens
    + '/';
}

/**
 * Auto-populates permalink field from page title
 *
 * Slugifies the title and sets it as the permalink, adding leading slash.
 * Only auto-populates if permalink is empty or hasn't been manually edited.
 *
 * @example
 * import { autoPopulatePermalink } from './modules/pages.js';
 * autoPopulatePermalink();
 */
export function autoPopulatePermalink() {
  const titleInput = document.getElementById('page-title');
  const permalinkInput = document.getElementById('page-permalink');

  if (!titleInput || !permalinkInput) return;

  // Only auto-populate if:
  // 1. Permalink is empty, OR
  // 2. Permalink hasn't been manually edited
  if (permalinkInput.value === '' || !window.permalinkManuallyEdited) {
    const slugified = slugifyPermalink(titleInput.value);
    permalinkInput.value = slugified;
  }
}

/**
 * Loads and displays a page for editing
 *
 * Fetches page data from the API, populates the editor form, initializes the markdown editor, and updates the URL.
 *
 * @param {string} filename - Name of the page file to edit
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 *
 * @throws {Error} If page load fails
 *
 * @example
 * import { editPage } from './modules/pages.js';
 * await editPage('about.md');
 */
export async function editPage(filename, updateUrl = true) {
  try {
    // Clear any existing page data first to prevent stale state
    window.currentPage_pages = null;
    clearPageDirty();
    window.permalinkManuallyEdited = false; // Reset flag when loading existing page

    const response = await fetch(`${window.API_BASE}/pages?path=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load page');

    window.currentPage_pages = await response.json();

    // Update URL to reflect editing state
    if (updateUrl) {
      const editUrl = `/admin-custom/pages/edit/${encodeURIComponent(filename)}`;
      window.history.pushState({ section: 'pages', editing: filename }, '', editUrl);
    }

    // Populate form
    document.getElementById('page-title').value = window.currentPage_pages.frontmatter.title || '';
    document.getElementById('page-permalink').value = window.currentPage_pages.frontmatter.permalink || '';
    document.getElementById('page-layout').value = window.currentPage_pages.frontmatter.layout || 'page';
    document.getElementById('page-protected').checked = window.currentPage_pages.frontmatter.protected === true;

    // Set date field - use existing date or default to current date/time
    const dateValue = window.currentPage_pages.frontmatter.date || new Date().toISOString();
    document.getElementById('page-date').value = window.formatDateForInput(dateValue);

    // Initialize markdown editor if needed
    if (!window.pageMarkdownEditor) {
      initPageMarkdownEditor();
    }
    // Ensure editor content is set (use setTimeout to ensure EasyMDE is ready)
    setTimeout(() => {
      if (window.pageMarkdownEditor) {
        window.pageMarkdownEditor.value(window.currentPage_pages.body || '');
      }
    }, 0);

    // Show editor
    document.getElementById('pages-list-view').classList.add('hidden');
    document.getElementById('pages-editor-view').classList.remove('hidden');
    document.getElementById('page-editor-title').textContent = `Edit: ${filename}`;
    document.getElementById('delete-page-btn').style.display = 'block';

    // Clear dirty flag when loading page
    clearPageDirty();

    // Add change listeners to form inputs
    setupPageFormChangeListeners();
  } catch (error) {
    showError('Failed to load page: ' + error.message);
  }
}

/**
 * Shows the editor form for creating a new page
 *
 * Clears all form fields, initializes the markdown editor, and updates the URL.
 *
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 *
 * @example
 * import { showNewPageForm } from './modules/pages.js';
 * showNewPageForm();
 */
export function showNewPageForm(updateUrl = true) {
  window.currentPage_pages = null;
  window.permalinkManuallyEdited = false; // Reset flag for new page

  // Update URL
  if (updateUrl) {
    window.history.pushState({ section: 'pages', editing: 'new' }, '', '/admin-custom/pages/new');
  }

  // Clear form
  document.getElementById('page-title').value = '';
  document.getElementById('page-permalink').value = '';
  document.getElementById('page-layout').value = 'page';
  document.getElementById('page-protected').checked = false;

  // Set current date/time as default for new pages
  document.getElementById('page-date').value = window.formatDateForInput(new Date().toISOString());

  // Initialize markdown editor if needed and clear content
  if (!window.pageMarkdownEditor) {
    initPageMarkdownEditor();
  }
  // Ensure editor is cleared (use setTimeout to ensure EasyMDE is ready)
  setTimeout(() => {
    if (window.pageMarkdownEditor) {
      window.pageMarkdownEditor.value('');
    }
  }, 0);

  // Show editor
  document.getElementById('pages-list-view').classList.add('hidden');
  document.getElementById('pages-editor-view').classList.remove('hidden');
  document.getElementById('page-editor-title').textContent = 'New Page';
  document.getElementById('delete-page-btn').style.display = 'none';

  // Clear dirty flag for new page
  clearPageDirty();

  // Add change listeners to form inputs
  setupPageFormChangeListeners();
}

/**
 * Sets up change listeners on page editor form fields
 *
 * Adds input event listeners to mark the page as dirty when any field changes.
 * Also sets up auto-populate permalink from title functionality.
 *
 * @example
 * import { setupPageFormChangeListeners } from './modules/pages.js';
 * setupPageFormChangeListeners();
 */
export function setupPageFormChangeListeners() {
  // Only setup once
  if (window._pageFormListenersSetup) return;
  window._pageFormListenersSetup = true;

  const formInputs = [
    'page-title',
    'page-permalink',
    'page-date',
    'page-layout',
    'page-protected'
  ];

  formInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', markPageDirty);
      input.addEventListener('change', markPageDirty);
    }
  });

  // Auto-populate permalink from title
  const titleInput = document.getElementById('page-title');
  if (titleInput) {
    titleInput.addEventListener('input', autoPopulatePermalink);
  }

  // Track manual edits to permalink
  const permalinkInput = document.getElementById('page-permalink');
  if (permalinkInput) {
    permalinkInput.addEventListener('input', () => {
      window.permalinkManuallyEdited = true;
    });
  }
}

/**
 * Returns to the pages list view from the editor
 *
 * Hides the editor, shows the list view, clears currentPage, updates URL, and optionally reloads pages.
 * Prompts user if there are unsaved changes.
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { showPagesList } from './modules/pages.js';
 * await showPagesList();
 */
export async function showPagesList() {
  // Check for unsaved changes
  if (window.pageHasUnsavedChanges) {
    const confirmed = await window.showConfirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }

  // Navigate back instead of pushing new state (makes browser back button work correctly)
  window.history.back();
}

/**
 * Saves the current page to the backend
 *
 * Validates required fields, collects form data, sends POST/PUT request, handles deployment tracking, and returns to pages list.
 *
 * @param {Event} event - Form submit event
 *
 * @throws {Error} If page save fails
 *
 * @example
 * import { savePage } from './modules/pages.js';
 * document.getElementById('page-form').addEventListener('submit', savePage);
 */
export async function savePage(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-page-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const title = document.getElementById('page-title').value;
    const permalink = document.getElementById('page-permalink').value;
    const layout = document.getElementById('page-layout').value;
    const protected_page = document.getElementById('page-protected').checked;
    const date = document.getElementById('page-date').value;
    const content = window.pageMarkdownEditor ? window.pageMarkdownEditor.value() : document.getElementById('page-content').value;

    const frontmatter = {
      layout,
      title,
      permalink
    };

    // Add date if provided
    if (date) {
      frontmatter.date = date;
    }

    // Only add protected field if it's true
    if (protected_page) {
      frontmatter.protected = true;
    }

    if (window.currentPage_pages) {
      // Update existing page
      const response = await fetch(`${window.API_BASE}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.currentPage_pages.path.replace('_pages/', ''),
          frontmatter,
          body: content,
          sha: window.currentPage_pages.sha
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save page');
      }

      const data = await response.json();
      if (data.commitSha) {
        window.trackDeployment(data.commitSha, `Update page: ${title}`, window.currentPage_pages.path.replace('_pages/', ''));
      }

      showSuccess('Page updated successfully!');
    } else {
      // Create new page
      const filename = generatePageFilename(title);

      const response = await fetch(`${window.API_BASE}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          frontmatter,
          body: content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create page');
      }

      const data = await response.json();
      if (data.commitSha) {
        window.trackDeployment(data.commitSha, `Create page: ${title}`, filename);
      }

      showSuccess('Page created successfully!');
    }

    // Clear dirty flag after successful save
    clearPageDirty();

    // Clear pages cache to force fresh data on next load
    clearPagesCache();

    // Reload pages and go back to list
    await loadPages();
    showPagesList();
  } catch (error) {
    showError('Failed to save page: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Page';
  }
}

/**
 * Deletes the currently edited page (move to trash)
 *
 * Shows confirmation dialog, validates that protected pages aren't deleted, sends delete request, and returns to pages list.
 *
 * @throws {Error} If page deletion fails
 *
 * @example
 * import { deletePage } from './modules/pages.js';
 * await deletePage();
 */
export async function deletePage() {
  if (!window.currentPage_pages) return;

  const title = window.currentPage_pages.frontmatter?.title || window.currentPage_pages.path;
  const confirmed = await window.showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const filename = window.currentPage_pages.path.replace('_pages/', '');

    const response = await fetch(`${window.API_BASE}/trash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: window.currentPage_pages.sha,
        type: 'page'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move page to trash');
    }

    const data = await response.json();
    if (data.commitSha) {
      window.trackDeployment(data.commitSha, `Move page to trash: ${title}`, filename);
    }

    showSuccess('Page moved to trash successfully!');

    // Clear pages cache
    clearPagesCache();

    await loadPages();
    showPagesList();
  } catch (error) {
    showError('Failed to move page to trash: ' + error.message);
  }
}

/**
 * Deletes a page from the pages list view (move to trash)
 *
 * Shows confirmation dialog, validates protected pages, sends delete request with SHA, tracks deployment, and refreshes the list.
 *
 * @param {string} filename - Name of the page file to delete
 * @param {string} sha - Git SHA of the file
 *
 * @throws {Error} If page deletion fails
 *
 * @example
 * import { deletePageFromList } from './modules/pages.js';
 * await deletePageFromList('about.md', 'abc123sha');
 */
export async function deletePageFromList(filename, sha) {
  const allPages = window.allPages || [];
  const page = allPages.find(p => p.name === filename);
  const title = page?.frontmatter?.title || filename;

  const confirmed = await window.showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${window.API_BASE}/trash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha,
        type: 'page'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move page to trash');
    }

    const data = await response.json();
    if (data.commitSha) {
      window.trackDeployment(data.commitSha, `Move page to trash: ${title}`, filename);
    }

    showSuccess('Page moved to trash successfully!');

    // Clear pages cache
    clearPagesCache();

    // Remove from local array
    window.allPages = allPages.filter(p => p.name !== filename);

    // Re-render the list
    renderPagesList();
  } catch (error) {
    showError('Failed to move page to trash: ' + error.message);
  }
}

/**
 * Generates a filename from page title
 *
 * Slugifies the title and adds .md extension.
 *
 * @param {string} title - Page title
 *
 * @returns {string} Generated filename
 *
 * @example
 * import { generatePageFilename } from './modules/pages.js';
 * const filename = generatePageFilename('About Us'); // Returns: 'about-us.md'
 */
export function generatePageFilename(title) {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}.md`;
}
