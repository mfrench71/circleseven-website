// State
let categories = [];
let tags = [];
let user = null;
let isDirty = false; // Track if there are unsaved changes
let lastSavedState = null; // Store last synced state

// API endpoints
const API_BASE = '/.netlify/functions';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

// Authentication
function initAuth() {
  netlifyIdentity.on('init', user => {
    if (user) {
      showMainApp(user);
    } else {
      showAuthGate();
    }
  });

  netlifyIdentity.on('login', user => {
    showMainApp(user);
    netlifyIdentity.close();
  });

  netlifyIdentity.on('logout', () => {
    showAuthGate();
  });

  // Initialize the widget
  netlifyIdentity.init();
}

function showAuthGate() {
  document.getElementById('auth-gate').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function showMainApp(authenticatedUser) {
  user = authenticatedUser;
  document.getElementById('auth-gate').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Hide loading indicator
  document.getElementById('loading').classList.add('hidden');

  // Show dashboard by default
  switchSection('dashboard');

  // Load last updated time
  updateLastUpdated();
}

// Load taxonomy from API
async function loadTaxonomy() {
  try {
    const response = await fetch(`${API_BASE}/taxonomy`);
    if (!response.ok) throw new Error('Failed to load taxonomy');

    const data = await response.json();
    categories = data.categories || [];
    tags = data.tags || [];

    // Store initial state as "saved"
    lastSavedState = JSON.stringify({ categories, tags });
    isDirty = false;

    renderCategories();
    renderTags();
    updateSaveButton();
  } catch (error) {
    showError('Failed to load taxonomy: ' + error.message);
  }
}

// Switch taxonomy tabs
function switchTaxonomyTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-teal-600', 'text-teal-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.add('border-teal-600', 'text-teal-600');
  activeTab.classList.remove('border-transparent', 'text-gray-500');

  // Update badge colors
  const categoriesBadge = document.getElementById('categories-count-badge');
  const tagsBadge = document.getElementById('tags-count-badge');

  if (tabName === 'categories') {
    categoriesBadge.classList.remove('bg-gray-100', 'text-gray-600');
    categoriesBadge.classList.add('bg-teal-100', 'text-teal-600');
    tagsBadge.classList.remove('bg-teal-100', 'text-teal-600');
    tagsBadge.classList.add('bg-gray-100', 'text-gray-600');
  } else {
    tagsBadge.classList.remove('bg-gray-100', 'text-gray-600');
    tagsBadge.classList.add('bg-teal-100', 'text-teal-600');
    categoriesBadge.classList.remove('bg-teal-100', 'text-teal-600');
    categoriesBadge.classList.add('bg-gray-100', 'text-gray-600');
  }

  // Update tab content
  document.querySelectorAll('.taxonomy-tab').forEach(content => {
    content.classList.add('hidden');
  });

  document.getElementById(`taxonomy-${tabName}-tab`).classList.remove('hidden');
}

// Tab switching - no longer needed with side-by-side layout

// Check if item has been modified
function isItemDirty(type, index) {
  if (!lastSavedState) return false;
  const saved = JSON.parse(lastSavedState);
  const current = type === 'category' ? categories : tags;
  const savedList = type === 'category' ? saved.categories : saved.tags;

  // Check if item exists in saved state and matches
  return current[index] !== savedList[index];
}

// Mark changes as dirty
function markDirty() {
  isDirty = true;
  updateSaveButton();
}

// Update save button state
function updateSaveButton() {
  const saveBtn = document.getElementById('save-btn');
  const currentState = JSON.stringify({ categories, tags });
  const hasChanges = currentState !== lastSavedState;

  if (hasChanges) {
    saveBtn.textContent = 'Save Changes';
    saveBtn.classList.remove('opacity-50');
    saveBtn.disabled = false;
  } else {
    saveBtn.textContent = 'All Saved ✓';
    saveBtn.classList.add('opacity-50');
    saveBtn.disabled = true;
  }
}

// Render categories
function renderCategories() {
  const list = document.getElementById('categories-list');
  const countBadge = document.getElementById('categories-count-badge');

  list.innerHTML = categories.map((cat, index) => {
    const statusIcon = getStatusIcon('category', index);
    return `
    <li class="flex items-center gap-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition cursor-move" data-index="${index}">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <span class="flex-1 font-medium">${escapeHtml(cat)}</span>
      ${statusIcon}
      <button
        onclick="editCategory(${index})"
        class="p-1 text-gray-500 hover:text-teal-600 transition"
        title="Edit"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      <button
        onclick="deleteCategory(${index})"
        class="p-1 text-gray-500 hover:text-red-600 transition"
        title="Delete"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </li>
  `;
  }).join('');

  countBadge.textContent = categories.length;

  // Initialize sortable
  new Sortable(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const item = categories.splice(evt.oldIndex, 1)[0];
      categories.splice(evt.newIndex, 0, item);
      markDirty();
      renderCategories();
    }
  });
}

// Get status icon for item
function getStatusIcon(type, index) {
  if (!lastSavedState) return '';

  const saved = JSON.parse(lastSavedState);
  const current = type === 'category' ? categories : tags;
  const savedList = type === 'category' ? saved.categories : saved.tags;

  // New item (not in saved state)
  if (index >= savedList.length) {
    return `<span class="text-xs text-yellow-600 flex items-center gap-1" title="Pending save">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="4"/>
      </svg>
    </span>`;
  }

  // Modified item
  if (current[index] !== savedList[index]) {
    return `<span class="text-xs text-yellow-600 flex items-center gap-1" title="Pending save">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="4"/>
      </svg>
    </span>`;
  }

  // Saved item
  return `<span class="text-xs text-green-600 flex items-center gap-1" title="Saved">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
    </svg>
  </span>`;
}

// Render tags
function renderTags() {
  const list = document.getElementById('tags-list');
  const countBadge = document.getElementById('tags-count-badge');

  list.innerHTML = tags.map((tag, index) => {
    const statusIcon = getStatusIcon('tag', index);
    return `
    <li class="flex items-center gap-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition cursor-move" data-index="${index}">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <span class="flex-1 font-medium">${escapeHtml(tag)}</span>
      ${statusIcon}
      <button
        onclick="editTag(${index})"
        class="p-1 text-gray-500 hover:text-teal-600 transition"
        title="Edit"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      <button
        onclick="deleteTag(${index})"
        class="p-1 text-gray-500 hover:text-red-600 transition"
        title="Delete"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </li>
  `;
  }).join('');

  countBadge.textContent = tags.length;

  // Initialize sortable
  new Sortable(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const item = tags.splice(evt.oldIndex, 1)[0];
      tags.splice(evt.newIndex, 0, item);
      markDirty();
      renderTags();
    }
  });
}

// Add category
function addCategory() {
  const input = document.getElementById('new-category');
  const value = input.value.trim();

  if (!value) return;

  if (categories.includes(value)) {
    showError('Category already exists');
    return;
  }

  categories.push(value);
  input.value = '';
  markDirty();
  renderCategories();
  hideMessages();
}

// Edit category
async function editCategory(index) {
  const newValue = await showModal('Edit Category', categories[index]);
  if (newValue === null) return;

  const trimmed = newValue.trim();
  if (!trimmed) {
    showError('Category name cannot be empty');
    return;
  }

  if (categories.includes(trimmed) && trimmed !== categories[index]) {
    showError('Category already exists');
    return;
  }

  categories[index] = trimmed;
  markDirty();
  renderCategories();
  hideMessages();
}

// Delete category
async function deleteCategory(index) {
  const confirmed = await showConfirm(`Are you sure you want to delete "${categories[index]}"?`);
  if (!confirmed) return;
  categories.splice(index, 1);
  markDirty();
  renderCategories();
  hideMessages();
}

// Add tag
function addTag() {
  const input = document.getElementById('new-tag');
  const value = input.value.trim();

  if (!value) return;

  if (tags.includes(value)) {
    showError('Tag already exists');
    return;
  }

  tags.push(value);
  input.value = '';
  markDirty();
  renderTags();
  hideMessages();
}

// Edit tag
async function editTag(index) {
  const newValue = await showModal('Edit Tag', tags[index]);
  if (newValue === null) return;

  const trimmed = newValue.trim();
  if (!trimmed) {
    showError('Tag name cannot be empty');
    return;
  }

  if (tags.includes(trimmed) && trimmed !== tags[index]) {
    showError('Tag already exists');
    return;
  }

  tags[index] = trimmed;
  markDirty();
  renderTags();
  hideMessages();
}

// Delete tag
async function deleteTag(index) {
  const confirmed = await showConfirm(`Are you sure you want to delete "${tags[index]}"?`);
  if (!confirmed) return;
  tags.splice(index, 1);
  markDirty();
  renderTags();
  hideMessages();
}

// Save taxonomy
async function saveTaxonomy() {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const response = await fetch(`${API_BASE}/taxonomy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ categories, tags })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save');
    }

    // Update saved state
    lastSavedState = JSON.stringify({ categories, tags });
    isDirty = false;

    showSuccess();
    renderCategories();
    renderTags();
    updateSaveButton();
  } catch (error) {
    showError('Failed to save taxonomy: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Changes';
  }
}

// UI helpers
function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.querySelector('p').textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function showSuccess() {
  const successEl = document.getElementById('success');
  successEl.classList.remove('hidden');
  setTimeout(() => successEl.classList.add('hidden'), 5000);
}

function hideMessages() {
  document.getElementById('error').classList.add('hidden');
  document.getElementById('success').classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Custom modal dialog
let modalResolve;

function showModal(title, defaultValue = '') {
  return new Promise((resolve) => {
    modalResolve = resolve;
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const input = document.getElementById('modal-input');

    titleEl.textContent = title;
    input.value = defaultValue;
    overlay.classList.remove('hidden');

    // Focus input and select text
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    // Handle Enter key
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        closeModal(true);
      }
    };

    // Handle Escape key
    input.onkeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal(false);
      }
    };
  });
}

function closeModal(confirmed) {
  const overlay = document.getElementById('modal-overlay');
  const input = document.getElementById('modal-input');

  overlay.classList.add('hidden');

  if (modalResolve) {
    modalResolve(confirmed ? input.value : null);
    modalResolve = null;
  }
}

// Custom confirm dialog
let confirmResolve;

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const overlay = document.getElementById('confirm-overlay');
    const messageEl = document.getElementById('confirm-message');

    messageEl.textContent = message;
    overlay.classList.remove('hidden');
  });
}

function closeConfirm(confirmed) {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('hidden');

  if (confirmResolve) {
    confirmResolve(confirmed);
    confirmResolve = null;
  }
}

// Section switching (Dashboard, Taxonomy, Settings)
function switchSection(sectionName) {
  // Update navigation buttons
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.remove('border-teal-600', 'text-teal-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });

  const activeNav = document.getElementById(`nav-${sectionName}`);
  activeNav.classList.add('border-teal-600', 'text-teal-600');
  activeNav.classList.remove('border-transparent', 'text-gray-500');

  // Update section panels
  document.querySelectorAll('.section-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  document.getElementById(`section-${sectionName}`).classList.remove('hidden');

  // Load data for the section if needed
  if (sectionName === 'taxonomy' && categories.length === 0) {
    loadTaxonomy();
  } else if (sectionName === 'settings') {
    loadSettings();
  }
}

// Load settings from API
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    if (!response.ok) throw new Error('Failed to load settings');

    const settings = await response.json();

    // Populate form fields
    Object.keys(settings).forEach(key => {
      const input = document.getElementById(`setting-${key}`);
      if (input) {
        input.value = settings[key] || '';
      }
    });
  } catch (error) {
    showError('Failed to load settings: ' + error.message);
  }
}

// Save settings
async function saveSettings(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('settings-save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const form = document.getElementById('settings-form');
    const formData = new FormData(form);
    const settings = {};

    formData.forEach((value, key) => {
      // Convert number fields
      if (['paginate', 'related_posts_count'].includes(key)) {
        settings[key] = parseInt(value, 10);
      } else {
        settings[key] = value;
      }
    });

    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save settings');
    }

    const result = await response.json();
    showSuccess(result.message || 'Settings saved successfully!');
  } catch (error) {
    showError('Failed to save settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Settings';
  }
}

// Update last updated time on dashboard
function updateLastUpdated() {
  const now = new Date();
  const timeStr = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const el = document.getElementById('last-updated');
  if (el) {
    el.textContent = timeStr;
  }
}

// Override showSuccess to accept custom messages
function showSuccess(message = 'Taxonomy saved successfully!') {
  const successEl = document.getElementById('success');
  const msgEl = successEl.querySelector('p');
  if (msgEl) {
    msgEl.textContent = message;
  } else {
    successEl.innerHTML = `<p class="text-green-800">${escapeHtml(message)}</p>`;
  }
  successEl.classList.remove('hidden');
  setTimeout(() => successEl.classList.add('hidden'), 5000);
}

// ===== POSTS MANAGEMENT =====

let allPosts = [];
let allPostsWithMetadata = [];
let currentPost = null;
let currentPage = 1;
const postsPerPage = 10;
let markdownEditor = null; // EasyMDE instance

// Load posts list with metadata in one API call
async function loadPosts() {
  try {
    // Fetch all posts with metadata in a single call using Promise.all on the server
    const response = await fetch(`${API_BASE}/posts?metadata=true`);
    if (!response.ok) throw new Error('Failed to load posts');

    const data = await response.json();
    allPosts = data.posts || [];

    // Process all posts with metadata into allPostsWithMetadata
    allPostsWithMetadata = allPosts.map(post => ({
      ...post,
      frontmatter: post.frontmatter || {},
      date: post.frontmatter?.date
        ? new Date(post.frontmatter.date)
        : new Date(post.name.substring(0, 10))
    }));

    renderPostsList();
    populateTaxonomySelects();
  } catch (error) {
    showError('Failed to load posts: ' + error.message);
  } finally {
    document.getElementById('posts-loading').classList.add('hidden');
  }
}

// Render posts list
function renderPostsList() {
  const tbody = document.getElementById('posts-table-body');
  const emptyEl = document.getElementById('posts-empty');
  const search = document.getElementById('posts-search')?.value.toLowerCase() || '';
  const sortBy = document.getElementById('posts-sort')?.value || 'date-desc';

  // Filter posts by search term (search in title and filename)
  let filtered = allPostsWithMetadata.filter(post => {
    const title = (post.frontmatter?.title || '').toLowerCase();
    const filename = post.name.toLowerCase();
    const searchTerm = search.toLowerCase();
    return title.includes(searchTerm) || filename.includes(searchTerm);
  });

  // Sort posts
  filtered = sortPostsList(filtered, sortBy);

  // Pagination
  const totalPosts = filtered.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const paginatedPosts = filtered.slice(startIndex, endIndex);

  // Show/hide empty state
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    document.getElementById('posts-pagination').classList.add('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  // Render table rows
  tbody.innerHTML = paginatedPosts.map((post, index) => {
    const rowNumber = startIndex + index + 1; // Calculate actual row number
    const title = post.frontmatter?.title || post.name;
    const date = formatDateShort(post.date);
    const categories = post.frontmatter?.categories || [];

    const categoriesBadges = Array.isArray(categories)
      ? categories.map(cat => `<span class="badge badge-category">${escapeHtml(cat)}</span>`).join('')
      : '';

    return `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="editPost('${escapeHtml(post.name)}')">
        <td class="px-4 py-3 text-sm text-gray-500">${rowNumber}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-900">${escapeHtml(title)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(post.name)}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${date}</td>
        <td class="px-4 py-3 text-sm">${categoriesBadges || '<span class="text-gray-400">-</span>'}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button
            onclick="event.stopPropagation(); editPost('${escapeHtml(post.name)}')"
            class="text-teal-600 hover:text-teal-700 mr-2"
            title="Edit"
          >
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onclick="event.stopPropagation(); deletePostFromList('${escapeHtml(post.name)}', '${escapeHtml(post.sha)}')"
            class="text-gray-500 hover:text-red-600"
            title="Delete"
          >
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Update pagination
  updatePagination(totalPosts, startIndex + 1, endIndex, totalPages);
}

// Sort posts list
function sortPostsList(posts, sortBy) {
  const sorted = [...posts];

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => b.date - a.date);
    case 'date-asc':
      return sorted.sort((a, b) => a.date - b.date);
    case 'title-asc':
      return sorted.sort((a, b) => {
        const titleA = (a.frontmatter?.title || a.name).toLowerCase();
        const titleB = (b.frontmatter?.title || b.name).toLowerCase();
        return titleA.localeCompare(titleB);
      });
    case 'title-desc':
      return sorted.sort((a, b) => {
        const titleA = (a.frontmatter?.title || a.name).toLowerCase();
        const titleB = (b.frontmatter?.title || b.name).toLowerCase();
        return titleB.localeCompare(titleA);
      });
    default:
      return sorted;
  }
}

// Update pagination UI
function updatePagination(total, start, end, totalPages) {
  const paginationEl = document.getElementById('posts-pagination');
  const prevBtn = document.getElementById('posts-prev-btn');
  const nextBtn = document.getElementById('posts-next-btn');

  if (totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }

  paginationEl.classList.remove('hidden');

  document.getElementById('posts-range-start').textContent = start;
  document.getElementById('posts-range-end').textContent = end;
  document.getElementById('posts-total').textContent = total;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Change page
function changePage(delta) {
  currentPage += delta;
  renderPostsList();
  document.getElementById('posts-list-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Sort posts (triggered by dropdown)
function sortPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Filter posts
function filterPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Format date for display
function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Initialize markdown editor
function initMarkdownEditor() {
  if (!markdownEditor) {
    markdownEditor = new EasyMDE({
      element: document.getElementById('post-content'),
      spellChecker: false,
      autosave: {
        enabled: false
      },
      toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
      status: ['lines', 'words', 'cursor']
    });
  }
}

// Edit post
async function editPost(filename) {
  try {
    const response = await fetch(`${API_BASE}/posts?path=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load post');

    currentPost = await response.json();

    // Populate form
    document.getElementById('post-title').value = currentPost.frontmatter.title || '';
    document.getElementById('post-date').value = formatDateForInput(currentPost.frontmatter.date);
    document.getElementById('post-image').value = currentPost.frontmatter.image || '';

    // Update image preview
    updateImagePreview();

    // Initialize markdown editor if needed
    if (!markdownEditor) {
      initMarkdownEditor();
    }
    markdownEditor.value(currentPost.body || '');

    // Set categories and tags
    setMultiSelect('post-categories', currentPost.frontmatter.categories || []);
    setMultiSelect('post-tags', currentPost.frontmatter.tags || []);

    // Show editor
    document.getElementById('posts-list-view').classList.add('hidden');
    document.getElementById('posts-editor-view').classList.remove('hidden');
    document.getElementById('post-editor-title').textContent = `Edit: ${filename}`;
    document.getElementById('delete-post-btn').style.display = 'block';
  } catch (error) {
    showError('Failed to load post: ' + error.message);
  }
}

// Show new post form
function showNewPostForm() {
  currentPost = null;

  // Clear form
  document.getElementById('post-title').value = '';
  document.getElementById('post-date').value = formatDateForInput(new Date().toISOString());
  document.getElementById('post-image').value = '';

  // Initialize markdown editor if needed
  if (!markdownEditor) {
    initMarkdownEditor();
  }
  markdownEditor.value('');

  setMultiSelect('post-categories', []);
  setMultiSelect('post-tags', []);

  // Show editor
  document.getElementById('posts-list-view').classList.add('hidden');
  document.getElementById('posts-editor-view').classList.remove('hidden');
  document.getElementById('post-editor-title').textContent = 'New Post';
  document.getElementById('delete-post-btn').style.display = 'none';
}

// Show posts list
function showPostsList() {
  document.getElementById('posts-editor-view').classList.add('hidden');
  document.getElementById('posts-list-view').classList.remove('hidden');
  currentPost = null;
}

// Save post
async function savePost(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-post-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const title = document.getElementById('post-title').value;
    const date = document.getElementById('post-date').value;
    const image = document.getElementById('post-image').value;
    const content = markdownEditor ? markdownEditor.value() : document.getElementById('post-content').value;
    const selectedCategories = getMultiSelectValues('post-categories');
    const selectedTags = getMultiSelectValues('post-tags');

    const frontmatter = {
      layout: 'post',
      title,
      date: new Date(date).toISOString(),
      categories: selectedCategories,
      tags: selectedTags
    };

    if (image) {
      frontmatter.image = image;
    }

    if (currentPost) {
      // Update existing post
      const response = await fetch(`${API_BASE}/posts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPost.path.replace('_posts/', ''),
          frontmatter,
          body: content,
          sha: currentPost.sha
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save post');
      }

      showSuccess('Post updated successfully!');
    } else {
      // Create new post
      const filename = generateFilename(title, date);

      const response = await fetch(`${API_BASE}/posts`, {
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
        throw new Error(error.message || 'Failed to create post');
      }

      showSuccess('Post created successfully!');
    }

    // Reload posts and go back to list
    await loadPosts();
    showPostsList();
  } catch (error) {
    showError('Failed to save post: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Post';
  }
}

// Delete post (from editor view - move to trash)
async function deletePost() {
  if (!currentPost) return;

  const title = currentPost.frontmatter?.title || currentPost.path;
  const confirmed = await showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const filename = currentPost.path.replace('_posts/', '');

    const response = await fetch(`${API_BASE}/trash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: currentPost.sha
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move post to trash');
    }

    showSuccess('Post moved to trash successfully!');
    await loadPosts();
    showPostsList();
  } catch (error) {
    showError('Failed to move post to trash: ' + error.message);
  }
}

// Delete post from list view (move to trash)
async function deletePostFromList(filename, sha) {
  const post = allPostsWithMetadata.find(p => p.name === filename);
  const title = post?.frontmatter?.title || filename;

  const confirmed = await showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move post to trash');
    }

    showSuccess('Post moved to trash successfully!');

    // Remove from local arrays
    allPosts = allPosts.filter(p => p.name !== filename);
    allPostsWithMetadata = allPostsWithMetadata.filter(p => p.name !== filename);

    // Re-render the list
    renderPostsList();
  } catch (error) {
    showError('Failed to move post to trash: ' + error.message);
  }
}

// Helper: Generate filename for new post
function generateFilename(title, date) {
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${dateStr}-${slug}.md`;
}

// Helper: Format date for datetime-local input
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper: Populate taxonomy selects
function populateTaxonomySelects() {
  const categoriesSelect = document.getElementById('post-categories');
  const tagsSelect = document.getElementById('post-tags');

  categoriesSelect.innerHTML = categories.map(cat =>
    `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
  ).join('');

  tagsSelect.innerHTML = tags.map(tag =>
    `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`
  ).join('');
}

// Helper: Set multi-select values
function setMultiSelect(id, values) {
  const select = document.getElementById(id);
  Array.from(select.options).forEach(option => {
    option.selected = values.includes(option.value);
  });
}

// Helper: Get multi-select values
function getMultiSelectValues(id) {
  const select = document.getElementById(id);
  return Array.from(select.selectedOptions).map(option => option.value);
}

// Helper: URL validation
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Update image preview
function updateImagePreview() {
  const imageUrl = document.getElementById('post-image').value.trim();
  const previewDiv = document.getElementById('image-preview');
  const previewImg = document.getElementById('image-preview-img');

  if (imageUrl && isValidUrl(imageUrl)) {
    previewImg.src = imageUrl;
    previewImg.onerror = () => {
      previewDiv.classList.add('hidden');
    };
    previewImg.onload = () => {
      previewDiv.classList.remove('hidden');
    };
  } else {
    previewDiv.classList.add('hidden');
  }
}

// ===== TRASH MANAGEMENT =====

let allTrashedPosts = [];

// Load trashed posts
async function loadTrash() {
  try {
    const response = await fetch(`${API_BASE}/trash`);
    if (!response.ok) throw new Error('Failed to load trash');

    const data = await response.json();
    allTrashedPosts = data.posts || [];

    renderTrashList();
  } catch (error) {
    showError('Failed to load trash: ' + error.message);
  } finally {
    document.getElementById('trash-loading').classList.add('hidden');
  }
}

// Render trash list
function renderTrashList() {
  const listEl = document.getElementById('trash-list');
  const emptyEl = document.getElementById('trash-empty');

  if (allTrashedPosts.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = allTrashedPosts.map(post => `
    <li class="flex items-center gap-4 p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
      <span class="flex-1 font-medium">${escapeHtml(post.name)}</span>
      <span class="text-xs text-gray-500">${(post.size / 1024).toFixed(1)} KB</span>
      <button
        onclick="restorePost('${escapeHtml(post.name)}', '${escapeHtml(post.sha)}')"
        class="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700"
        title="Restore"
      >
        Restore
      </button>
      <button
        onclick="permanentlyDeletePost('${escapeHtml(post.name)}', '${escapeHtml(post.sha)}')"
        class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        title="Permanently Delete"
      >
        Delete Forever
      </button>
    </li>
  `).join('');
}

// Restore post from trash
async function restorePost(filename, sha) {
  const confirmed = await showConfirm(`Restore "${filename}" to posts?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to restore post');
    }

    showSuccess('Post restored successfully!');

    // Remove from local array
    allTrashedPosts = allTrashedPosts.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();

    // Reload posts if on posts section
    if (allPosts.length > 0) {
      await loadPosts();
    }
  } catch (error) {
    showError('Failed to restore post: ' + error.message);
  }
}

// Permanently delete post
async function permanentlyDeletePost(filename, sha) {
  const confirmed = await showConfirm(`Permanently delete "${filename}"? This cannot be undone!`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: sha
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete post');
    }

    showSuccess('Post permanently deleted');

    // Remove from local array
    allTrashedPosts = allTrashedPosts.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();
  } catch (error) {
    showError('Failed to delete post: ' + error.message);
  }
}

// Update switchSection to load posts and trash
const originalSwitchSection = switchSection;
switchSection = function(sectionName) {
  originalSwitchSection(sectionName);

  if (sectionName === 'posts') {
    // Always show the posts list when switching to Posts section
    showPostsList();

    // Load posts if not loaded yet
    if (allPosts.length === 0) {
      loadPosts();
    }
  } else if (sectionName === 'trash' && allTrashedPosts.length === 0) {
    loadTrash();
  }
};
