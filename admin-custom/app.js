// State
let categories = [];
let tags = [];
let user = null;
let isDirty = false; // Track if there are unsaved changes
let lastSavedState = null; // Store last synced state
let cloudinaryWidget = null; // Cloudinary Media Library instance
let cloudinaryUploadWidget = null; // Cloudinary Upload Widget instance
let allMedia = []; // All media files from Cloudinary
let currentMediaPage = 1;
const mediaPerPage = 20;

// Deployment tracking state
let activeDeployments = []; // Array of { commitSha, action, startedAt }
let deploymentPollInterval = null;

// API endpoints
const API_BASE = '/.netlify/functions';

// Utility: Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Utility: Button loading state
function setButtonLoading(button, loading, loadingText = 'Loading...') {
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
  }
}

// Cached DOM references
const DOM = {
  // Populated after DOM is loaded
  error: null,
  success: null,
  loading: null,
  authGate: null,
  mainApp: null,
  // Posts
  postsListView: null,
  postsEditorView: null,
  postsTableBody: null,
  postsSearch: null,
  postsSort: null,
  postsEmpty: null,
  postsPagination: null,
  // Post Editor
  postTitle: null,
  postDate: null,
  postImage: null,
  postContent: null,
  imagePreview: null,
  imagePreviewImg: null,
  // Taxonomy
  categoriesList: null,
  tagsList: null,
  saveBtn: null,
  // Sections
  sectionDashboard: null,
  sectionTaxonomy: null,
  sectionPosts: null,
  sectionTrash: null,
  sectionSettings: null
};

// Cache DOM elements after page load
function cacheDOMElements() {
  DOM.error = document.getElementById('error');
  DOM.success = document.getElementById('success');
  DOM.loading = document.getElementById('loading');
  DOM.authGate = document.getElementById('auth-gate');
  DOM.mainApp = document.getElementById('main-app');

  // Posts
  DOM.postsListView = document.getElementById('posts-list-view');
  DOM.postsEditorView = document.getElementById('posts-editor-view');
  DOM.postsTableBody = document.getElementById('posts-table-body');
  DOM.postsSearch = document.getElementById('posts-search');
  DOM.postsSort = document.getElementById('posts-sort');
  DOM.postsEmpty = document.getElementById('posts-empty');
  DOM.postsPagination = document.getElementById('posts-pagination');

  // Post Editor
  DOM.postTitle = document.getElementById('post-title');
  DOM.postDate = document.getElementById('post-date');
  DOM.postImage = document.getElementById('post-image');
  DOM.postContent = document.getElementById('post-content');
  DOM.imagePreview = document.getElementById('image-preview');
  DOM.imagePreviewImg = document.getElementById('image-preview-img');

  // Taxonomy
  DOM.categoriesList = document.getElementById('categories-list');
  DOM.tagsList = document.getElementById('tags-list');
  DOM.saveBtn = document.getElementById('save-btn');

  // Sections
  DOM.sectionDashboard = document.getElementById('section-dashboard');
  DOM.sectionTaxonomy = document.getElementById('section-taxonomy');
  DOM.sectionPosts = document.getElementById('section-posts');
  DOM.sectionMedia = document.getElementById('section-media');
  DOM.sectionTrash = document.getElementById('section-trash');
  DOM.sectionSettings = document.getElementById('section-settings');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  initAuth();
  handleRouteChange();
  setupUnsavedChangesWarning();
  registerServiceWorker();

  // Start background polling for deployment history (refreshes every 60s)
  // This captures code pushes and other deployments not triggered via admin
  startDeploymentHistoryPolling();
});

// Register Service Worker for offline capability
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/admin-custom/sw.js')
      .then(registration => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  }
}

// Setup unsaved changes warning
function setupUnsavedChangesWarning() {
  // Warn before closing/refreshing browser tab
  window.addEventListener('beforeunload', (e) => {
    if (postHasUnsavedChanges || settingsHasUnsavedChanges || isDirty) {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // For older browsers
    }
  });
}

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
  DOM.authGate.classList.remove('hidden');
  DOM.mainApp.classList.add('hidden');
}

function showMainApp(authenticatedUser) {
  user = authenticatedUser;
  DOM.authGate.classList.add('hidden');
  DOM.mainApp.classList.remove('hidden');

  // Hide loading indicator
  DOM.loading.classList.add('hidden');

  // Handle routing on login
  handleRouteChange();

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
    showToastError('Failed to load taxonomy: ' + error.message);
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

  // Update add item inputs
  document.querySelectorAll('.taxonomy-add-item').forEach(input => {
    input.classList.add('hidden');
  });

  document.getElementById(`taxonomy-add-${tabName === 'categories' ? 'category' : 'tag'}`).classList.remove('hidden');
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
  const tbody = document.getElementById('categories-list');
  const countBadge = document.getElementById('categories-count-badge');

  tbody.innerHTML = categories.map((cat, index) => {
    const statusIcon = getStatusIcon('category', index);
    return `
    <tr class="hover:bg-gray-50 cursor-move" data-index="${index}">
      <td class="px-4 py-3 text-sm text-gray-500">${index + 1}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-bars text-gray-400 flex-shrink-0"></i>
          <span class="font-medium text-gray-900">${escapeHtml(cat)}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-center">${statusIcon}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button
          onclick="editCategory(${index})"
          class="btn-icon-edit"
          title="Edit category"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button
          onclick="deleteCategory(${index})"
          class="btn-icon-delete"
          title="Delete category"
        >
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
  }).join('');

  countBadge.textContent = categories.length;

  // Initialize sortable
  new Sortable(tbody, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    handle: 'tr',
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
  const tbody = document.getElementById('tags-list');
  const countBadge = document.getElementById('tags-count-badge');

  tbody.innerHTML = tags.map((tag, index) => {
    const statusIcon = getStatusIcon('tag', index);
    return `
    <tr class="hover:bg-gray-50 cursor-move" data-index="${index}">
      <td class="px-4 py-3 text-sm text-gray-500">${index + 1}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-bars text-gray-400 flex-shrink-0"></i>
          <span class="font-medium text-gray-900">${escapeHtml(tag)}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-center">${statusIcon}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button
          onclick="editTag(${index})"
          class="btn-icon-edit"
          title="Edit tag"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button
          onclick="deleteTag(${index})"
          class="btn-icon-delete"
          title="Delete tag"
        >
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
  }).join('');

  countBadge.textContent = tags.length;

  // Initialize sortable
  new Sortable(tbody, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    handle: 'tr',
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
    showToastError('Category already exists');
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
    showToastError('Category name cannot be empty');
    return;
  }

  if (categories.includes(trimmed) && trimmed !== categories[index]) {
    showToastError('Category already exists');
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
    showToastError('Tag already exists');
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
    showToastError('Tag name cannot be empty');
    return;
  }

  if (tags.includes(trimmed) && trimmed !== tags[index]) {
    showToastError('Tag already exists');
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
  const saveBtn = DOM.saveBtn;
  setButtonLoading(saveBtn, true, 'Saving...');

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

    const data = await response.json();
    if (data.commitSha) {
      trackDeployment(data.commitSha, 'Update taxonomy', 'taxonomy.yml');
    }

    // Update saved state
    lastSavedState = JSON.stringify({ categories, tags });
    isDirty = false;

    showToastSuccess('Taxonomy saved successfully!');
    renderCategories();
    renderTags();
    updateSaveButton();
  } catch (error) {
    showToastError('Failed to save taxonomy: ' + error.message);
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// UI helpers
function showError(message) {
  DOM.error.querySelector('p').textContent = message;
  DOM.error.classList.remove('hidden');
  setTimeout(() => DOM.error.classList.add('hidden'), 5000);
}

function showSuccess(message = 'Taxonomy saved successfully!') {
  const msgEl = DOM.success.querySelector('p');
  if (msgEl) {
    msgEl.textContent = message;
  } else {
    DOM.success.innerHTML = `<p class="text-green-800">${escapeHtml(message)}</p>`;
  }
  DOM.success.classList.remove('hidden');
  setTimeout(() => DOM.success.classList.add('hidden'), 5000);
}

function hideMessages() {
  DOM.error.classList.add('hidden');
  DOM.success.classList.add('hidden');
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

function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const overlay = document.getElementById('confirm-overlay');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const buttonEl = document.getElementById('confirm-button');

    // Set title (default to "Confirm Delete")
    titleEl.textContent = options.title || 'Confirm Delete';

    // Set message
    messageEl.textContent = message;

    // Set button text and color (default to red Delete button)
    buttonEl.textContent = options.buttonText || 'Delete';
    buttonEl.className = options.buttonClass || 'btn-danger';

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
function switchSection(sectionName, updateUrl = true) {
  // Clear currentPost when switching away from posts section
  if (sectionName !== 'posts') {
    currentPost = null;
    clearPostDirty();
  }

  // Update URL using History API if requested
  if (updateUrl) {
    const newPath = sectionName === 'dashboard' ? '/admin-custom/' : `/admin-custom/${sectionName}`;
    window.history.pushState({ section: sectionName }, '', newPath);
  }

  // Update page title based on section
  const titleMap = {
    dashboard: 'Dashboard',
    taxonomy: 'Taxonomy',
    posts: 'Posts',
    pages: 'Pages',
    media: 'Media Library',
    trash: 'Trash',
    settings: 'Settings'
  };
  document.title = `${titleMap[sectionName] || 'Admin'} - Circle Seven`;

  // Update navigation buttons
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.remove('border-teal-600', 'text-teal-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });

  const activeNav = document.getElementById(`nav-${sectionName}`);
  if (activeNav) {
    activeNav.classList.add('border-teal-600', 'text-teal-600');
    activeNav.classList.remove('border-transparent', 'text-gray-500');
  }

  // Update section panels
  document.querySelectorAll('.section-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const sectionEl = document.getElementById(`section-${sectionName}`);
  if (sectionEl) {
    sectionEl.classList.remove('hidden');
  }

  // Load data for the section if needed
  if (sectionName === 'taxonomy' && categories.length === 0) {
    loadTaxonomy();
  } else if (sectionName === 'settings') {
    loadSettings();
  }
}

// Handle URL path changes (back/forward/refresh)
async function handleRouteChange() {
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(p => p);
  const searchParams = new URLSearchParams(window.location.search);

  // Get the section from the URL path
  // /admin-custom/ -> dashboard
  // /admin-custom/posts -> posts
  // /admin-custom/posts/edit/filename -> posts (with editor open)
  // /admin-custom/posts?page=2 -> posts (with pagination)
  let section = 'dashboard';

  if (pathParts.length >= 2 && pathParts[0] === 'admin-custom') {
    const requestedSection = pathParts[1];
    const validSections = ['dashboard', 'taxonomy', 'posts', 'pages', 'media', 'trash', 'settings'];
    if (validSections.includes(requestedSection)) {
      section = requestedSection;
    }
  }

  // Switch section without updating URL (to avoid loop)
  await switchSection(section, false);

  // Handle posts section sub-routes
  if (section === 'posts' && pathParts.length >= 3) {
    if (pathParts[2] === 'new') {
      // /admin-custom/posts/new
      showNewPostForm(false); // Don't update URL, we're already there
    } else if (pathParts[2] === 'edit' && pathParts.length >= 4) {
      // /admin-custom/posts/edit/filename
      const filename = decodeURIComponent(pathParts.slice(3).join('/'));
      if (filename) {
        editPost(filename, false); // Don't update URL, we're already there
      }
    }
  } else if (section === 'posts' && searchParams.has('page')) {
    // /admin-custom/posts?page=2
    const page = parseInt(searchParams.get('page'), 10);
    if (page > 0) {
      currentPage = page;
      renderPostsList();
    }
  }

  // Handle pages section sub-routes
  if (section === 'pages' && pathParts.length >= 3) {
    if (pathParts[2] === 'new') {
      // /admin-custom/pages/new
      showNewPageForm(false); // Don't update URL, we're already there
    } else if (pathParts[2] === 'edit' && pathParts.length >= 4) {
      // /admin-custom/pages/edit/filename
      const filename = decodeURIComponent(pathParts.slice(3).join('/'));
      if (filename) {
        editPage(filename, false); // Don't update URL, we're already there
      }
    }
  }
}

// Initialize routing with History API
window.addEventListener('popstate', (e) => {
  // Handle browser back/forward buttons
  handleRouteChange();
});

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
    showToastError('Failed to load settings: ' + error.message);
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
    if (result.commitSha) {
      trackDeployment(result.commitSha, 'Update site settings', '_config.yml');
    }

    showToastSuccess(result.message || 'Settings saved successfully!');
  } catch (error) {
    showToastError('Failed to save settings: ' + error.message);
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

// ===== POSTS MANAGEMENT =====

let allPosts = [];
let allPostsWithMetadata = [];
let currentPost = null;
let currentPage = 1;
const postsPerPage = 10;
let markdownEditor = null; // EasyMDE instance
let postHasUnsavedChanges = false; // Track unsaved changes in post editor
let settingsHasUnsavedChanges = false; // Track unsaved changes in settings

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
    showToastError('Failed to load posts: ' + error.message);
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

    // Display categories hierarchically with collapsible toggle
    let categoriesDisplay = '';
    if (Array.isArray(categories) && categories.length > 0) {
      if (categories.length === 1) {
        // Single category - no toggle needed
        categoriesDisplay = `<span class="badge badge-category">${escapeHtml(categories[0])}</span>`;
      } else {
        // Multiple categories - show first with toggle, rest collapsible
        const firstCategory = `<span class="badge badge-category">${escapeHtml(categories[0])}</span>`;
        const remainingCategories = categories.slice(1).map((cat, idx) => {
          const separator = '<span class="text-gray-400 mx-1">›</span>';
          return `${separator}<span class="badge badge-category">${escapeHtml(cat)}</span>`;
        }).join('');

        const rowId = `cat-row-${rowNumber}`;
        categoriesDisplay = `
          <div class="flex items-center gap-1">
            <button
              onclick="event.stopPropagation(); toggleCategories('${rowId}')"
              class="category-toggle flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              title="Toggle category hierarchy"
            >
              <i class="fas fa-chevron-down chevron-down"></i>
              <i class="fas fa-chevron-up chevron-up hidden"></i>
            </button>
            ${firstCategory}
            <span class="category-remaining hidden">${remainingCategories}</span>
          </div>
        `;
      }
    } else {
      categoriesDisplay = '<span class="text-gray-400">-</span>';
    }

    return `
      <tr class="hover:bg-gray-50 cursor-pointer" data-row-id="cat-row-${rowNumber}" onclick="editPost('${escapeHtml(post.name)}')">
        <td class="px-4 py-3 text-sm text-gray-500">${rowNumber}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-900">${escapeHtml(title)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(post.name)}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${date}</td>
        <td class="px-4 py-3 text-sm">${categoriesDisplay}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button
            onclick="event.stopPropagation(); editPost('${escapeHtml(post.name)}')"
            class="btn-icon-edit"
            title="Edit post"
          >
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onclick="event.stopPropagation(); deletePostFromList('${escapeHtml(post.name)}', '${escapeHtml(post.sha)}')"
            class="btn-icon-delete"
            title="Move post to trash"
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

// Toggle category visibility in posts list
function toggleCategories(rowId) {
  const row = document.querySelector(`[data-row-id="${rowId}"]`);
  if (!row) return;

  const toggleBtn = row.querySelector('.category-toggle');
  const remainingCats = row.querySelector('.category-remaining');
  const chevronDown = toggleBtn.querySelector('.chevron-down');
  const chevronUp = toggleBtn.querySelector('.chevron-up');

  // Toggle visibility
  if (remainingCats.classList.contains('hidden')) {
    remainingCats.classList.remove('hidden');
    chevronDown.classList.add('hidden');
    chevronUp.classList.remove('hidden');
  } else {
    remainingCats.classList.add('hidden');
    chevronDown.classList.remove('hidden');
    chevronUp.classList.add('hidden');
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

  // Update URL with new page number
  const url = currentPage > 1
    ? `/admin-custom/posts?page=${currentPage}`
    : '/admin-custom/posts';
  window.history.pushState({ section: 'posts', page: currentPage }, '', url);

  renderPostsList();
  document.getElementById('posts-list-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Sort posts (triggered by dropdown)
function sortPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Filter posts (debounced version will be created in init)
function filterPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Debounced version for search input
const debouncedFilterPosts = debounce(filterPosts, 300);

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

    // Track changes in markdown editor
    markdownEditor.codemirror.on('change', () => {
      postHasUnsavedChanges = true;
    });
  }
}

// Mark post as having unsaved changes
function markPostDirty() {
  postHasUnsavedChanges = true;
}

// Clear post dirty flag
function clearPostDirty() {
  postHasUnsavedChanges = false;
}

// Edit post
async function editPost(filename, updateUrl = true) {
  try {
    // Clear any existing post data first to prevent stale state
    currentPost = null;
    clearPostDirty();

    const response = await fetch(`${API_BASE}/posts?path=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load post');

    currentPost = await response.json();

    // Update URL to reflect editing state (unless called from handleRouteChange)
    if (updateUrl) {
      const editUrl = `/admin-custom/posts/edit/${encodeURIComponent(filename)}`;
      window.history.pushState({ section: 'posts', editing: filename }, '', editUrl);
    }

    // Populate form
    document.getElementById('post-title').value = currentPost.frontmatter.title || '';
    document.getElementById('post-date').value = formatDateForInput(currentPost.frontmatter.date);

    // Support both 'image' and 'featured_image' fields
    const imageUrl = currentPost.frontmatter.image || currentPost.frontmatter.featured_image || '';
    document.getElementById('post-image').value = imageUrl;

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

    // Clear dirty flag when loading post
    clearPostDirty();

    // Add change listeners to form inputs
    setupPostFormChangeListeners();
  } catch (error) {
    showToastError('Failed to load post: ' + error.message);
  }
}

// Show new post form
function showNewPostForm(updateUrl = true) {
  currentPost = null;

  // Update URL (unless called from handleRouteChange)
  if (updateUrl) {
    window.history.pushState({ section: 'posts', editing: 'new' }, '', '/admin-custom/posts/new');
  }

  // Clear form
  document.getElementById('post-title').value = '';
  document.getElementById('post-date').value = formatDateForInput(new Date().toISOString());
  document.getElementById('post-image').value = '';

  // Clear image preview
  document.getElementById('image-preview').classList.add('hidden');

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

  // Clear dirty flag for new post
  clearPostDirty();

  // Add change listeners to form inputs
  setupPostFormChangeListeners();
}

// Setup change listeners for post form
function setupPostFormChangeListeners() {
  // Only setup once
  if (window._postFormListenersSetup) return;
  window._postFormListenersSetup = true;

  const formInputs = [
    'post-title',
    'post-date',
    'post-image'
  ];

  formInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', markPostDirty);
    }
  });
}

// Show posts list
async function showPostsList() {
  // Check for unsaved changes
  if (postHasUnsavedChanges) {
    const confirmed = await showConfirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }

  // Update URL to posts list
  const url = currentPage > 1
    ? `/admin-custom/posts?page=${currentPage}`
    : '/admin-custom/posts';
  window.history.pushState({ section: 'posts', page: currentPage }, '', url);

  document.getElementById('posts-editor-view').classList.add('hidden');
  document.getElementById('posts-list-view').classList.remove('hidden');
  currentPost = null;
  clearPostDirty();
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
      // Preserve the original image field name when editing
      if (currentPost && currentPost.frontmatter.featured_image) {
        frontmatter.featured_image = image;
      } else {
        frontmatter.image = image;
      }
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

      const data = await response.json();
      if (data.commitSha) {
        trackDeployment(data.commitSha, `Update post: ${title}`, currentPost.path.replace('_posts/', ''));
      }

      showToastSuccess('Post updated successfully!');
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

      const data = await response.json();
      if (data.commitSha) {
        trackDeployment(data.commitSha, `Create post: ${title}`, filename);
      }

      showToastSuccess('Post created successfully!');
    }

    // Clear dirty flag after successful save
    clearPostDirty();

    // Reload posts and go back to list
    await loadPosts();
    showPostsList();
  } catch (error) {
    showToastError('Failed to save post: ' + error.message);
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

    const data = await response.json();
    if (data.commitSha) {
      trackDeployment(data.commitSha, `Move post to trash: ${title}`, filename);
    }

    showToastSuccess('Post moved to trash successfully!');
    await loadPosts();
    showPostsList();
  } catch (error) {
    showToastError('Failed to move post to trash: ' + error.message);
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

    showToastSuccess('Post moved to trash successfully!');

    // Remove from local arrays
    allPosts = allPosts.filter(p => p.name !== filename);
    allPostsWithMetadata = allPostsWithMetadata.filter(p => p.name !== filename);

    // Re-render the list
    renderPostsList();
  } catch (error) {
    showToastError('Failed to move post to trash: ' + error.message);
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

// Helper: Populate taxonomy selects (WordPress-style autocomplete)
function populateTaxonomySelects() {
  // Initialize autocomplete for categories
  initTaxonomyAutocomplete('categories', categories);

  // Initialize autocomplete for tags
  initTaxonomyAutocomplete('tags', tags);
}

// Selected taxonomy items state
let selectedCategories = [];
let selectedTags = [];

// Initialize WordPress-style taxonomy autocomplete
function initTaxonomyAutocomplete(type, availableItems) {
  const input = document.getElementById(`${type}-input`);
  const suggestionsDiv = document.getElementById(`${type}-suggestions`);
  const selectedDiv = document.getElementById(`${type}-selected`);

  let selectedItems = type === 'categories' ? selectedCategories : selectedTags;
  let activeIndex = -1;

  // Handle input changes
  input.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (searchTerm === '') {
      suggestionsDiv.classList.add('hidden');
      return;
    }

    // Filter items that match search and aren't already selected
    const matches = availableItems.filter(item =>
      item.toLowerCase().includes(searchTerm) &&
      !selectedItems.includes(item)
    );

    if (matches.length === 0) {
      suggestionsDiv.innerHTML = '<div class="taxonomy-suggestion-empty">No matches found</div>';
      suggestionsDiv.classList.remove('hidden');
    } else {
      suggestionsDiv.innerHTML = matches.map((item, index) =>
        `<div class="taxonomy-suggestion-item" data-value="${escapeHtml(item)}" data-index="${index}">
          ${escapeHtml(item)}
        </div>`
      ).join('');
      suggestionsDiv.classList.remove('hidden');
      activeIndex = -1;
    }
  });

  // Handle keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = suggestionsDiv.querySelectorAll('.taxonomy-suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        addTaxonomyItem(type, items[activeIndex].dataset.value);
      }
    } else if (e.key === 'Escape') {
      suggestionsDiv.classList.add('hidden');
    }
  });

  function updateActiveItem(items) {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Handle suggestion clicks
  suggestionsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.taxonomy-suggestion-item');
    if (item) {
      addTaxonomyItem(type, item.dataset.value);
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest(`#${type}-input`) && !e.target.closest(`#${type}-suggestions`)) {
      suggestionsDiv.classList.add('hidden');
    }
  });
}

// Add taxonomy item (category or tag)
function addTaxonomyItem(type, value) {
  const selectedDiv = document.getElementById(`${type}-selected`);
  const input = document.getElementById(`${type}-input`);
  const suggestionsDiv = document.getElementById(`${type}-suggestions`);

  let selectedItems = type === 'categories' ? selectedCategories : selectedTags;

  if (!selectedItems.includes(value)) {
    selectedItems.push(value);

    // Update the state
    if (type === 'categories') {
      selectedCategories = selectedItems;
    } else {
      selectedTags = selectedItems;
    }

    renderSelectedTaxonomy(type);

    // Mark post as dirty when taxonomy changes
    markPostDirty();
  }

  input.value = '';
  suggestionsDiv.classList.add('hidden');
}

// Remove taxonomy item
function removeTaxonomyItem(type, value) {
  if (type === 'categories') {
    selectedCategories = selectedCategories.filter(item => item !== value);
  } else {
    selectedTags = selectedTags.filter(item => item !== value);
  }

  renderSelectedTaxonomy(type);

  // Mark post as dirty when taxonomy changes
  markPostDirty();
}

// Render selected taxonomy items
function renderSelectedTaxonomy(type) {
  const selectedDiv = document.getElementById(`${type}-selected`);
  const selectedItems = type === 'categories' ? selectedCategories : selectedTags;

  selectedDiv.innerHTML = selectedItems.map(item => `
    <div class="taxonomy-tag">
      <span>${escapeHtml(item)}</span>
      <button
        type="button"
        class="taxonomy-tag-remove"
        onclick="removeTaxonomyItem('${type}', '${escapeHtml(item).replace(/'/g, "\\'")}')"
        title="Remove ${escapeHtml(item)}"
      >
        ×
      </button>
    </div>
  `).join('');
}

// Helper: Set taxonomy values (for loading existing post)
function setMultiSelect(id, values) {
  const type = id === 'post-categories' ? 'categories' : 'tags';

  if (type === 'categories') {
    selectedCategories = values || [];
  } else {
    selectedTags = values || [];
  }

  renderSelectedTaxonomy(type);
}

// Helper: Get taxonomy values (for saving post)
function getMultiSelectValues(id) {
  const type = id === 'post-categories' ? 'categories' : 'tags';
  return type === 'categories' ? selectedCategories : selectedTags;
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

// Initialize Cloudinary Media Library widget
function initCloudinaryWidget() {
  if (cloudinaryWidget) return cloudinaryWidget;

  // Check if Cloudinary library is loaded
  if (typeof cloudinary === 'undefined') {
    console.error('Cloudinary library not loaded yet');
    return null;
  }

  cloudinaryWidget = cloudinary.createMediaLibrary({
    cloud_name: 'circleseven',
    api_key: '732138267195618',
    remove_header: false,
    max_files: 1,
    inline_container: null,
    folder: {
      path: '',
      resource_type: 'image'
    }
  }, {
    insertHandler: function(data) {
      const asset = data.assets[0];
      const imageUrl = asset.secure_url;

      // Update featured image field
      document.getElementById('post-image').value = imageUrl;
      updateImagePreview();
      markPostDirty();
    }
  });

  return cloudinaryWidget;
}

// Show Cloudinary widget for featured image selection
function selectFeaturedImage() {
  const widget = initCloudinaryWidget();
  if (widget) {
    widget.show();
  } else {
    showToastError('Cloudinary library is still loading. Please try again in a moment.');
  }
}

// Update image preview
function updateImagePreview() {
  const imageUrl = document.getElementById('post-image').value.trim();
  const previewDiv = document.getElementById('image-preview');
  const previewImg = document.getElementById('image-preview-img');

  if (imageUrl) {
    // Construct full Cloudinary URL if it's a partial path
    let fullImageUrl = imageUrl;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      // Assume it's a partial Cloudinary path and construct full URL
      fullImageUrl = `https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/${imageUrl}`;
    }

    // Show preview immediately
    previewDiv.classList.remove('hidden');
    previewImg.src = fullImageUrl;

    // Hide if image fails to load
    previewImg.onerror = () => {
      previewDiv.classList.add('hidden');
    };
  } else {
    previewDiv.classList.add('hidden');
  }
}

// Open image modal
function openImageModal() {
  const imageUrl = document.getElementById('post-image').value.trim();
  const modalOverlay = document.getElementById('image-modal-overlay');
  const modalImg = document.getElementById('image-modal-img');

  if (imageUrl) {
    // Construct full Cloudinary URL if it's a partial path
    let fullImageUrl = imageUrl;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      fullImageUrl = `https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/${imageUrl}`;
    }

    modalImg.src = fullImageUrl;
    modalOverlay.classList.remove('hidden');

    // Close on Escape key
    document.addEventListener('keydown', handleImageModalEscape);
  }
}

// Close image modal
function closeImageModal() {
  const modalOverlay = document.getElementById('image-modal-overlay');
  modalOverlay.classList.add('hidden');
  document.removeEventListener('keydown', handleImageModalEscape);
}

// Handle Escape key for image modal
function handleImageModalEscape(e) {
  if (e.key === 'Escape') {
    closeImageModal();
  }
}

// ===== TRASH MANAGEMENT =====

let allTrashedItems = [];

// Load trashed items (posts and pages)
async function loadTrash() {
  try {
    const response = await fetch(`${API_BASE}/trash`);
    if (!response.ok) throw new Error('Failed to load trash');

    const data = await response.json();
    allTrashedItems = data.items || [];

    renderTrashList();
  } catch (error) {
    showToastError('Failed to load trash: ' + error.message);
  } finally {
    document.getElementById('trash-loading').classList.add('hidden');
  }
}

// Render trash list
function renderTrashList() {
  const listEl = document.getElementById('trash-list');
  const emptyEl = document.getElementById('trash-empty');

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
        ${trashedAtDisplay ? `<div class="text-xs text-gray-500">Trashed: ${trashedAtDisplay}</div>` : ''}
      </div>
      <span class="px-2 py-0.5 text-xs font-medium rounded ${typeBadgeColor}">${typeLabel}</span>
      <span class="text-xs text-gray-500">${(item.size / 1024).toFixed(1)} KB</span>
      <button
        onclick="restoreItem('${escapeHtml(item.name)}', '${escapeHtml(item.sha)}', '${escapeHtml(item.type)}')"
        class="btn-primary-sm"
        title="Restore item from trash"
      >
        Restore
      </button>
      <button
        onclick="permanentlyDeleteItem('${escapeHtml(item.name)}', '${escapeHtml(item.sha)}', '${escapeHtml(item.type)}')"
        class="btn-danger-sm"
        title="Permanently delete item"
      >
        Delete Forever
      </button>
    </li>
  `;
  }).join('');
}

// Restore item from trash (post or page)
async function restoreItem(filename, sha, type) {
  const itemType = type === 'page' ? 'page' : 'post';
  const destination = type === 'page' ? 'pages' : 'posts';
  const confirmed = await showConfirm(`Restore "${filename}" to ${destination}?`, {
    title: 'Confirm Restore',
    buttonText: 'Restore',
    buttonClass: 'btn-primary'
  });
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
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

    showToastSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored successfully!`);

    // Remove from local array
    allTrashedItems = allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();

    // Reload posts or pages if applicable
    if (type === 'post' && allPosts.length > 0) {
      await loadPosts();
    } else if (type === 'page' && allPages.length > 0) {
      await loadPages();
    }
  } catch (error) {
    showToastError(`Failed to restore ${itemType}: ` + error.message);
  }
}

// Permanently delete item (post or page)
async function permanentlyDeleteItem(filename, sha, type) {
  const itemType = type === 'page' ? 'page' : 'post';
  const confirmed = await showConfirm(`Permanently delete "${filename}"? This cannot be undone!`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
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

    showToastSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} permanently deleted`);

    // Remove from local array
    allTrashedItems = allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();
  } catch (error) {
    showToastError(`Failed to delete ${itemType}: ` + error.message);
  }
}

// Update switchSection to load posts and trash
const originalSwitchSection = switchSection;
switchSection = async function(sectionName, updateUrl = true) {
  originalSwitchSection(sectionName, updateUrl);

  if (sectionName === 'posts') {
    // Always show the posts list when switching to Posts section
    showPostsList();

    // Load taxonomy first if not loaded (needed for category/tag selects)
    if (categories.length === 0) {
      await loadTaxonomy();
    }

    // Load posts if not loaded yet
    if (allPosts.length === 0) {
      await loadPosts();
    }
  } else if (sectionName === 'pages' && allPages.length === 0) {
    await loadPages();
  } else if (sectionName === 'trash' && allTrashedItems.length === 0) {
    await loadTrash();
  } else if (sectionName === 'media' && allMedia.length === 0) {
    await loadMedia();
  }
};

// ===== MEDIA LIBRARY MANAGEMENT =====

// Load media from Cloudinary
async function loadMedia() {
  try {
    const response = await fetch(`${API_BASE}/media`);
    if (!response.ok) throw new Error('Failed to load media');

    const data = await response.json();
    allMedia = data.resources || [];

    renderMediaGrid();
  } catch (error) {
    showToastError('Failed to load media: ' + error.message);
  } finally {
    document.getElementById('media-loading').classList.add('hidden');
  }
}

// Render media grid
function renderMediaGrid() {
  const grid = document.getElementById('media-grid');
  const emptyEl = document.getElementById('media-empty');
  const loadingEl = document.getElementById('media-loading');
  const search = document.getElementById('media-search')?.value.toLowerCase() || '';
  const filter = document.getElementById('media-filter')?.value || 'all';

  loadingEl.classList.add('hidden');

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
    grid.innerHTML = '';
    emptyEl.classList.remove('hidden');
    document.getElementById('media-pagination').classList.add('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  // Render media grid
  grid.innerHTML = paginatedMedia.map(media => {
    const thumbnailUrl = media.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/');
    const filename = media.public_id.split('/').pop();
    const sizeKB = (media.bytes / 1024).toFixed(1);

    return `
      <div class="media-item group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-teal-500 transition cursor-pointer">
        <div class="aspect-square relative">
          <img
            src="${thumbnailUrl}"
            alt="${escapeHtml(filename)}"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
            <div class="opacity-0 group-hover:opacity-100 transition flex gap-2">
              <button
                onclick="event.stopPropagation(); copyMediaUrl('${escapeHtml(media.secure_url)}')"
                class="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
                title="Copy URL"
              >
                <i class="fas fa-copy"></i>
              </button>
              <button
                onclick="event.stopPropagation(); viewMediaFull('${escapeHtml(media.secure_url)}')"
                class="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100"
                title="View Full Size"
              >
                <i class="fas fa-search-plus"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="p-2">
          <p class="text-xs font-medium text-gray-900 truncate" title="${escapeHtml(filename)}">
            ${escapeHtml(filename)}
          </p>
          <p class="text-xs text-gray-500">
            ${media.width} × ${media.height} • ${sizeKB} KB
          </p>
        </div>
      </div>
    `;
  }).join('');

  // Update pagination
  updateMediaPagination(totalPages);
}

// Check if media was uploaded recently (within 7 days)
function isRecentUpload(createdAt) {
  const uploadDate = new Date(createdAt);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return uploadDate > weekAgo;
}

// Update media pagination
function updateMediaPagination(totalPages) {
  const paginationEl = document.getElementById('media-pagination');
  const prevBtn = document.getElementById('media-prev-btn');
  const nextBtn = document.getElementById('media-next-btn');
  const currentPageEl = document.getElementById('media-current-page');
  const totalPagesEl = document.getElementById('media-total-pages');

  if (totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }

  paginationEl.classList.remove('hidden');
  currentPageEl.textContent = currentMediaPage;
  totalPagesEl.textContent = totalPages;
  prevBtn.disabled = currentMediaPage === 1;
  nextBtn.disabled = currentMediaPage === totalPages;
}

// Change media page
function changeMediaPage(delta) {
  currentMediaPage += delta;
  renderMediaGrid();
  document.getElementById('section-media').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Filter media (triggered by dropdown)
function filterMedia() {
  currentMediaPage = 1;
  renderMediaGrid();
}

// Debounced version for search input
const debouncedFilterMedia = debounce(filterMedia, 300);

// Copy media URL to clipboard
async function copyMediaUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToastSuccess('Image URL copied to clipboard!');
  } catch (error) {
    showToastError('Failed to copy URL: ' + error.message);
  }
}

// View media full size
function viewMediaFull(url) {
  const modalOverlay = document.getElementById('image-modal-overlay');
  const modalImg = document.getElementById('image-modal-img');

  modalImg.src = url;
  modalOverlay.classList.remove('hidden');

  // Close on Escape key
  document.addEventListener('keydown', handleImageModalEscape);
}

// Open Cloudinary upload widget
function openCloudinaryUpload() {
  // Check if Cloudinary library is loaded
  if (typeof cloudinary === 'undefined') {
    showToastError('Cloudinary library is still loading. Please try again in a moment.');
    return;
  }

  if (!cloudinaryUploadWidget) {
    cloudinaryUploadWidget = cloudinary.createUploadWidget({
      cloudName: 'circleseven',
      uploadPreset: 'ml_default', // You'll need to create an unsigned upload preset in Cloudinary
      sources: ['local', 'url', 'camera'],
      multiple: true,
      maxFiles: 10,
      folder: '',
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    }, (error, result) => {
      if (!error && result && result.event === 'success') {
        showToastSuccess('Image uploaded successfully!');
        // Reload media library
        loadMedia();
      }
      if (error) {
        showToastError('Upload failed: ' + error.message);
      }
    });
  }

  cloudinaryUploadWidget.open();
}

// ===== PAGES MANAGEMENT =====

let allPages = [];
let currentPage_pages = null; // Note: Different from currentPage (posts pagination)
let pageMarkdownEditor = null; // Separate markdown editor for pages
let pageHasUnsavedChanges = false; // Track unsaved changes in page editor

// Load pages list with metadata
async function loadPages() {
  try {
    const response = await fetch(`${API_BASE}/pages?metadata=true`);
    if (!response.ok) throw new Error('Failed to load pages');

    const data = await response.json();
    allPages = data.pages || [];

    renderPagesList();
  } catch (error) {
    showToastError('Failed to load pages: ' + error.message);
  } finally {
    document.getElementById('pages-loading').classList.add('hidden');
  }
}

// Render pages list
function renderPagesList() {
  const tbody = document.getElementById('pages-table-body');
  const emptyEl = document.getElementById('pages-empty');
  const search = document.getElementById('pages-search')?.value.toLowerCase() || '';

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

    return `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="editPage('${escapeHtml(page.name)}')">
        <td class="px-4 py-3 text-sm text-gray-500">${index + 1}</td>
        <td class="px-4 py-3">
          <div class="font-medium text-gray-900">${escapeHtml(title)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(page.name)}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(permalink)}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button
            onclick="event.stopPropagation(); editPage('${escapeHtml(page.name)}')"
            class="btn-icon-edit"
            title="Edit page"
          >
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onclick="event.stopPropagation(); deletePageFromList('${escapeHtml(page.name)}', '${escapeHtml(page.sha)}')"
            class="btn-icon-delete"
            title="Move page to trash"
          >
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Filter pages (debounced version)
function filterPages() {
  renderPagesList();
}

const debouncedFilterPages = debounce(filterPages, 300);

// Initialize page markdown editor
function initPageMarkdownEditor() {
  if (!pageMarkdownEditor) {
    pageMarkdownEditor = new EasyMDE({
      element: document.getElementById('page-content'),
      spellChecker: false,
      autosave: {
        enabled: false
      },
      toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
      status: ['lines', 'words', 'cursor']
    });

    // Track changes in markdown editor
    pageMarkdownEditor.codemirror.on('change', () => {
      pageHasUnsavedChanges = true;
    });
  }
}

// Mark page as having unsaved changes
function markPageDirty() {
  pageHasUnsavedChanges = true;
}

// Clear page dirty flag
function clearPageDirty() {
  pageHasUnsavedChanges = false;
}

// Edit page
async function editPage(filename, updateUrl = true) {
  try {
    // Clear any existing page data first to prevent stale state
    currentPage_pages = null;
    clearPageDirty();

    const response = await fetch(`${API_BASE}/pages?path=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load page');

    currentPage_pages = await response.json();

    // Update URL to reflect editing state
    if (updateUrl) {
      const editUrl = `/admin-custom/pages/edit/${encodeURIComponent(filename)}`;
      window.history.pushState({ section: 'pages', editing: filename }, '', editUrl);
    }

    // Populate form
    document.getElementById('page-title').value = currentPage_pages.frontmatter.title || '';
    document.getElementById('page-permalink').value = currentPage_pages.frontmatter.permalink || '';
    document.getElementById('page-layout').value = currentPage_pages.frontmatter.layout || 'page';

    // Initialize markdown editor if needed
    if (!pageMarkdownEditor) {
      initPageMarkdownEditor();
    }
    pageMarkdownEditor.value(currentPage_pages.body || '');

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
    showToastError('Failed to load page: ' + error.message);
  }
}

// Show new page form
function showNewPageForm(updateUrl = true) {
  currentPage_pages = null;

  // Update URL
  if (updateUrl) {
    window.history.pushState({ section: 'pages', editing: 'new' }, '', '/admin-custom/pages/new');
  }

  // Clear form
  document.getElementById('page-title').value = '';
  document.getElementById('page-permalink').value = '';
  document.getElementById('page-layout').value = 'page';

  // Initialize markdown editor if needed
  if (!pageMarkdownEditor) {
    initPageMarkdownEditor();
  }
  pageMarkdownEditor.value('');

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

// Setup change listeners for page form
function setupPageFormChangeListeners() {
  // Only setup once
  if (window._pageFormListenersSetup) return;
  window._pageFormListenersSetup = true;

  const formInputs = [
    'page-title',
    'page-permalink',
    'page-layout'
  ];

  formInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', markPageDirty);
    }
  });
}

// Show pages list
async function showPagesList() {
  // Check for unsaved changes
  if (pageHasUnsavedChanges) {
    const confirmed = await showConfirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }

  // Update URL to pages list
  window.history.pushState({ section: 'pages' }, '', '/admin-custom/pages');

  document.getElementById('pages-editor-view').classList.add('hidden');
  document.getElementById('pages-list-view').classList.remove('hidden');
  currentPage_pages = null;
  clearPageDirty();
}

// Save page
async function savePage(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-page-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const title = document.getElementById('page-title').value;
    const permalink = document.getElementById('page-permalink').value;
    const layout = document.getElementById('page-layout').value;
    const content = pageMarkdownEditor ? pageMarkdownEditor.value() : document.getElementById('page-content').value;

    const frontmatter = {
      layout,
      title,
      permalink
    };

    if (currentPage_pages) {
      // Update existing page
      const response = await fetch(`${API_BASE}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPage_pages.path.replace('_pages/', ''),
          frontmatter,
          body: content,
          sha: currentPage_pages.sha
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save page');
      }

      const data = await response.json();
      if (data.commitSha) {
        trackDeployment(data.commitSha, `Update page: ${title}`, currentPage_pages.path.replace('_pages/', ''));
      }

      showToastSuccess('Page updated successfully!');
    } else {
      // Create new page
      const filename = generatePageFilename(title);

      const response = await fetch(`${API_BASE}/pages`, {
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
        trackDeployment(data.commitSha, `Create page: ${title}`, filename);
      }

      showToastSuccess('Page created successfully!');
    }

    // Clear dirty flag after successful save
    clearPageDirty();

    // Reload pages and go back to list
    await loadPages();
    showPagesList();
  } catch (error) {
    showToastError('Failed to save page: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Page';
  }
}

// Delete page (from editor view - move to trash)
async function deletePage() {
  if (!currentPage_pages) return;

  const title = currentPage_pages.frontmatter?.title || currentPage_pages.path;
  const confirmed = await showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const filename = currentPage_pages.path.replace('_pages/', '');

    const response = await fetch(`${API_BASE}/trash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        sha: currentPage_pages.sha,
        type: 'page'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move page to trash');
    }

    const data = await response.json();
    if (data.commitSha) {
      trackDeployment(data.commitSha, `Move page to trash: ${title}`, filename);
    }

    showToastSuccess('Page moved to trash successfully!');
    await loadPages();
    showPagesList();
  } catch (error) {
    showToastError('Failed to move page to trash: ' + error.message);
  }
}

// Delete page from list view (move to trash)
async function deletePageFromList(filename, sha) {
  const page = allPages.find(p => p.name === filename);
  const title = page?.frontmatter?.title || filename;

  const confirmed = await showConfirm(`Move "${title}" to trash?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
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
      trackDeployment(data.commitSha, `Move page to trash: ${title}`, filename);
    }

    showToastSuccess('Page moved to trash successfully!');

    // Remove from local array
    allPages = allPages.filter(p => p.name !== filename);

    // Re-render the list
    renderPagesList();
  } catch (error) {
    showToastError('Failed to move page to trash: ' + error.message);
  }
}

// Helper: Generate filename for new page
function generatePageFilename(title) {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}.md`;
}

// ===== DEPLOYMENT STATUS TRACKING =====

const MAX_DEPLOYMENT_HISTORY = 50; // Keep last 50 deployments

// Load deployment history from localStorage
function loadDeploymentHistory() {
  try {
    const stored = localStorage.getItem('deploymentHistory');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load deployment history:', error);
    return [];
  }
}

// Fetch recent deployments from GitHub Actions (includes all deployments, not just admin-triggered)
async function fetchRecentDeploymentsFromGitHub() {
  try {
    const response = await fetch(`${API_BASE}/deployment-history`);
    if (!response.ok) {
      console.warn('Deployment history endpoint not available yet:', response.status);
      return [];
    }

    const data = await response.json();
    return data.deployments || [];
  } catch (error) {
    console.warn('Failed to fetch deployment history from GitHub (will retry):', error.message);
    return [];
  }
}

// Get merged deployment history (localStorage + recent GitHub deployments)
async function getDeploymentHistory() {
  const localHistory = loadDeploymentHistory();
  const githubHistory = await fetchRecentDeploymentsFromGitHub();

  // Merge and deduplicate by commitSha
  const merged = [...localHistory];
  const existingShas = new Set(localHistory.map(d => d.commitSha));

  githubHistory.forEach(deployment => {
    if (!existingShas.has(deployment.commitSha)) {
      merged.push(deployment);
    }
  });

  // Sort by completedAt (most recent first)
  merged.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt));

  return merged;
}

// Save deployment history to localStorage
function saveDeploymentHistory(history) {
  try {
    // Auto-archive: keep only the most recent MAX_DEPLOYMENT_HISTORY items
    const trimmed = history.slice(-MAX_DEPLOYMENT_HISTORY);
    localStorage.setItem('deploymentHistory', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save deployment history:', error);
  }
}

// Add deployment to history
function addToDeploymentHistory(deployment) {
  const history = loadDeploymentHistory();
  history.push({
    commitSha: deployment.commitSha,
    action: deployment.action,
    itemId: deployment.itemId,
    status: deployment.status,
    startedAt: deployment.startedAt,
    completedAt: new Date(),
    duration: Math.floor((new Date() - new Date(deployment.startedAt)) / 1000)
  });
  saveDeploymentHistory(history);
  updateDashboardDeployments(); // Refresh display
}

// Track deployment and start polling
function trackDeployment(commitSha, action, itemId = null) {
  if (!commitSha) return;

  activeDeployments.push({
    commitSha,
    action,
    itemId, // Track which item this deployment is for (e.g., filename)
    startedAt: new Date(),
    status: 'pending'
  });

  showDeploymentBanner();
  startDeploymentPolling();
  updateDashboardDeployments();
}

// Show deployment status banner
function showDeploymentBanner() {
  let banner = document.getElementById('deployment-banner');

  if (!banner) {
    // Create banner if it doesn't exist
    banner = document.createElement('div');
    banner.id = 'deployment-banner';
    banner.className = 'fixed bottom-4 right-4 bg-teal-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-md';
    banner.innerHTML = `
      <i class="fas fa-spinner fa-spin text-lg"></i>
      <div class="flex-1">
        <div id="deployment-message" class="font-medium">Publishing changes to GitHub Pages...</div>
        <div id="deployment-time" class="text-xs opacity-90 mt-1"></div>
      </div>
    `;
    document.body.appendChild(banner);
  }

  banner.classList.remove('hidden');
  updateDeploymentBanner();
}

// Update deployment banner message
function updateDeploymentBanner() {
  const messageEl = document.getElementById('deployment-message');
  const timeEl = document.getElementById('deployment-time');

  if (activeDeployments.length === 0) return;

  const oldest = activeDeployments[0];
  const elapsed = Math.floor((new Date() - oldest.startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (messageEl) {
    const count = activeDeployments.length;
    const plural = count === 1 ? 'change' : 'changes';
    messageEl.textContent = `Publishing ${count} ${plural} to GitHub Pages...`;
  }

  if (timeEl) {
    timeEl.textContent = `(${minutes}:${seconds.toString().padStart(2, '0')})`;
  }
}

// Hide deployment banner
function hideDeploymentBanner() {
  const banner = document.getElementById('deployment-banner');
  if (banner) {
    banner.classList.add('hidden');
  }
}

// Update dashboard deployments card (async to fetch history)
async function updateDashboardDeployments() {
  const card = document.getElementById('deployments-card');
  if (!card) return; // Not on dashboard

  const cardContent = card.querySelector('.card-content');
  if (!cardContent) return;

  // Get deployment history
  const history = await getDeploymentHistory();
  const recentHistory = history.slice(0, 10); // Show last 10

  console.log('Deployment history:', { total: history.length, showing: recentHistory.length });

  // Combine active and history for table display
  const mainDeployments = [
    ...activeDeployments.map(d => ({ ...d, isActive: true })),
    ...recentHistory.filter(d => d.status === 'completed' || d.status === 'failed').map(d => ({ ...d, isActive: false }))
  ];

  // Separate skipped/cancelled for collapsible section
  const hiddenDeployments = recentHistory.filter(d => d.status === 'skipped' || d.status === 'cancelled');

  // Show empty state if no deployments at all
  if (mainDeployments.length === 0 && hiddenDeployments.length === 0) {
    cardContent.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-rocket text-4xl mb-2 text-gray-400"></i>
        <p>No deployments yet</p>
        <p class="text-sm mt-1">Make a change to see deployment history</p>
      </div>
    `;
    return;
  }

  // Build compact table
  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
            <th class="text-left py-2 px-3 font-semibold text-gray-700">Action</th>
            <th class="text-right py-2 px-3 font-semibold text-gray-700">Duration</th>
            <th class="text-right py-2 px-3 font-semibold text-gray-700">Time</th>
          </tr>
        </thead>
        <tbody>
  `;

  mainDeployments.forEach((deployment, index) => {
    let statusIcon, statusColor, statusText, rowBg;

    if (deployment.isActive) {
      // Active deployments
      let animationClass = '';

      if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        rowBg = 'bg-blue-100';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
        rowBg = 'bg-yellow-50';
      } else {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
        rowBg = 'bg-gray-50';
      }

      const elapsed = Math.floor((new Date() - new Date(deployment.startedAt)) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      html += `
        <tr class="${rowBg} ${animationClass}">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${timeStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">live</td>
        </tr>
      `;
    } else {
      // Historical deployments
      rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

      if (deployment.status === 'completed') {
        statusIcon = 'fa-check-circle';
        statusColor = 'text-green-600';
        statusText = 'Success';
      } else if (deployment.status === 'failed') {
        statusIcon = 'fa-times-circle';
        statusColor = 'text-red-600';
        statusText = 'Failed';
      } else if (deployment.status === 'cancelled') {
        statusIcon = 'fa-ban';
        statusColor = 'text-yellow-600';
        statusText = 'Cancelled';
      } else if (deployment.status === 'skipped') {
        statusIcon = 'fa-forward';
        statusColor = 'text-blue-600';
        statusText = 'Skipped';
      } else {
        statusIcon = 'fa-circle';
        statusColor = 'text-gray-600';
        statusText = deployment.status;
      }

      // Format relative time
      const completedAt = new Date(deployment.completedAt || deployment.startedAt);
      const relativeTime = getRelativeTime(completedAt);

      // Format duration
      let durationStr = '-';
      if (deployment.duration) {
        const minutes = Math.floor(deployment.duration / 60);
        const seconds = deployment.duration % 60;
        durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }

      html += `
        <tr class="${rowBg} hover:bg-gray-100">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${durationStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">${relativeTime}</td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Add collapsible section for skipped/cancelled if any
  if (hiddenDeployments.length > 0) {
    html += `
      <details class="mt-3">
        <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-900 py-2 px-3 bg-gray-50 rounded flex items-center justify-between">
          <span>
            <i class="fas fa-chevron-right mr-2 text-xs transition-transform"></i>
            Skipped/Cancelled Deployments (${hiddenDeployments.length})
          </span>
        </summary>
        <div class="mt-2 overflow-x-auto">
          <table class="w-full text-sm">
            <tbody>
    `;

    hiddenDeployments.forEach((deployment, index) => {
      let statusIcon, statusColor, statusText;

      if (deployment.status === 'cancelled') {
        statusIcon = 'fa-ban';
        statusColor = 'text-yellow-600';
        statusText = 'Cancelled';
      } else {
        statusIcon = 'fa-forward';
        statusColor = 'text-blue-600';
        statusText = 'Skipped';
      }

      const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      const completedAt = new Date(deployment.completedAt || deployment.startedAt);
      const relativeTime = getRelativeTime(completedAt);

      let durationStr = '-';
      if (deployment.duration) {
        const minutes = Math.floor(deployment.duration / 60);
        const seconds = deployment.duration % 60;
        durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }

      html += `
        <tr class="${rowBg} opacity-75">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${durationStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">${relativeTime}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </details>
    `;
  }

  cardContent.innerHTML = html;

  // Add event listener to rotate chevron on details toggle
  const details = cardContent.querySelector('details');
  if (details) {
    details.addEventListener('toggle', (e) => {
      const chevron = e.target.querySelector('.fa-chevron-right');
      if (chevron) {
        chevron.style.transform = e.target.open ? 'rotate(90deg)' : 'rotate(0deg)';
      }
    });
  }
}

// Helper: Get relative time string
function getRelativeTime(date) {
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== TOAST NOTIFICATION SYSTEM =====

// Feature flag: Set to false to rollback to old alert system
const USE_TOAST_NOTIFICATIONS = true;

let toastContainer = null;
let toastIdCounter = 0;

// Initialize toast container
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 max-w-sm';
    toastContainer.style.cssText = 'pointer-events: none;';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
  const container = initToastContainer();
  const toastId = `toast-${toastIdCounter++}`;

  // Toast color schemes
  const schemes = {
    success: { bg: 'bg-green-600', icon: 'fa-check-circle', hoverBg: 'hover:bg-green-700' },
    error: { bg: 'bg-red-600', icon: 'fa-exclamation-circle', hoverBg: 'hover:bg-red-700' },
    warning: { bg: 'bg-yellow-600', icon: 'fa-exclamation-triangle', hoverBg: 'hover:bg-yellow-700' },
    info: { bg: 'bg-blue-600', icon: 'fa-info-circle', hoverBg: 'hover:bg-blue-700' }
  };

  const scheme = schemes[type] || schemes.info;

  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `${scheme.bg} text-white px-3 py-2 rounded-md shadow-lg flex items-center gap-2 transform transition-all duration-300 translate-x-full opacity-0`;
  toast.style.cssText = 'pointer-events: auto; min-width: 250px;';
  toast.innerHTML = `
    <i class="fas ${scheme.icon} flex-shrink-0"></i>
    <div class="flex-1 text-sm">${escapeHtml(message)}</div>
    <button onclick="closeToast('${toastId}')" class="ml-1 ${scheme.hoverBg} rounded p-0.5 transition flex-shrink-0 opacity-70 hover:opacity-100" title="Dismiss">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 10);

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      closeToast(toastId);
    }, duration);
  }

  return toastId;
}

// Close specific toast (exposed globally for onclick handler)
window.closeToast = function(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      toast.remove();
      // Clean up container if empty
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
        toastContainer = null;
      }
    }, 300);
  }
}

// Unified message functions with feature flag for easy rollback
function showToastSuccess(message) {
  if (USE_TOAST_NOTIFICATIONS) {
    return showToast(message, 'success', 5000);
  } else {
    // Fallback to old DOM-based success message
    showSuccess(message);
  }
}

function showToastError(message) {
  if (USE_TOAST_NOTIFICATIONS) {
    return showToast(message, 'error', 7000);
  } else {
    // Fallback to old DOM-based error message
    showError(message);
  }
}

function showToastWarning(message) {
  if (USE_TOAST_NOTIFICATIONS) {
    return showToast(message, 'warning', 6000);
  } else {
    // Fallback to old DOM-based error message (no separate warning in old system)
    showError(message);
  }
}

function showToastInfo(message) {
  if (USE_TOAST_NOTIFICATIONS) {
    return showToast(message, 'info', 5000);
  } else {
    // Fallback to old DOM-based success message
    showSuccess(message);
  }
}

// Start background polling for deployment history (slower refresh for all deployments)
let historyPollInterval = null;
function startDeploymentHistoryPolling() {
  if (historyPollInterval) return; // Already polling

  // Poll every 60 seconds to refresh history (includes code pushes, not just admin changes)
  historyPollInterval = setInterval(async () => {
    // Only update if we're on the dashboard
    const dashboardCard = document.getElementById('deployments-card');
    if (dashboardCard) {
      await updateDashboardDeployments();
    }
  }, 60000); // 60 seconds
}

// Stop background history polling
function stopDeploymentHistoryPolling() {
  if (historyPollInterval) {
    clearInterval(historyPollInterval);
    historyPollInterval = null;
  }
}

// Start polling deployment status
function startDeploymentPolling() {
  if (deploymentPollInterval) return; // Already polling

  deploymentPollInterval = setInterval(async () => {
    if (activeDeployments.length === 0) {
      clearInterval(deploymentPollInterval);
      deploymentPollInterval = null;
      hideDeploymentBanner();
      return;
    }

    // Update time display
    updateDeploymentBanner();

    // Check status of each deployment
    for (let i = activeDeployments.length - 1; i >= 0; i--) {
      const deployment = activeDeployments[i];

      // Timeout after 10 minutes (600 seconds)
      const elapsed = Math.floor((new Date() - deployment.startedAt) / 1000);
      if (elapsed > 600) {
        activeDeployments.splice(i, 1);
        showToastInfo('Deployment timeout reached. Changes should be live now.');

        if (activeDeployments.length === 0) {
          hideDeploymentBanner();
        }
        continue;
      }

      try {
        const response = await fetch(`${API_BASE}/deployment-status?sha=${deployment.commitSha}`);
        if (!response.ok) continue;

        const data = await response.json();

        // Update deployment status
        deployment.status = data.status;
        deployment.updatedAt = new Date();
        updateDashboardDeployments();

        if (data.status === 'completed') {
          // Deployment successful
          addToDeploymentHistory(deployment);
          activeDeployments.splice(i, 1);
          showToastSuccess('Changes published successfully! Site is now live.');
          updateDashboardDeployments();

          if (activeDeployments.length === 0) {
            hideDeploymentBanner();
          }
        } else if (data.status === 'failed') {
          // Deployment failed
          addToDeploymentHistory(deployment);
          activeDeployments.splice(i, 1);
          showToastError('Deployment failed. Please check GitHub Actions for details.');
          updateDashboardDeployments();

          if (activeDeployments.length === 0) {
            hideDeploymentBanner();
          }
        } else if (data.status === 'cancelled') {
          // Deployment cancelled
          addToDeploymentHistory(deployment);
          activeDeployments.splice(i, 1);
          showToastWarning('Deployment was cancelled. Changes may not be live.');
          updateDashboardDeployments();

          if (activeDeployments.length === 0) {
            hideDeploymentBanner();
          }
        } else if (data.status === 'skipped') {
          // Deployment skipped (superseded by newer commit)
          addToDeploymentHistory(deployment);
          activeDeployments.splice(i, 1);
          showToastInfo('Deployment skipped - superseded by a newer change. Latest changes will deploy.');
          updateDashboardDeployments();

          if (activeDeployments.length === 0) {
            hideDeploymentBanner();
          }
        }
        // pending, queued, in_progress continue polling
      } catch (error) {
        console.error('Failed to check deployment status:', error);
      }
    }
  }, 5000); // Poll every 5 seconds
}

// Modified restore item function to track deployment
async function restoreItemWithTracking(filename, sha, type) {
  const itemType = type === 'page' ? 'page' : 'post';
  const destination = type === 'page' ? 'pages' : 'posts';
  const confirmed = await showConfirm(`Restore "${filename}" to ${destination}?`, {
    title: 'Confirm Restore',
    buttonText: 'Restore',
    buttonClass: 'btn-primary'
  });
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/trash`, {
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
    if (result.commitSha) {
      trackDeployment(result.commitSha, `Restore ${itemType}: ${filename}`);
    }

    showToastSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored successfully!`);

    // Remove from local array
    allTrashedItems = allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();

    // Reload posts or pages if applicable
    if (type === 'post' && allPosts.length > 0) {
      await loadPosts();
    } else if (type === 'page' && allPages.length > 0) {
      await loadPages();
    }
  } catch (error) {
    showToastError(`Failed to restore ${itemType}: ` + error.message);
  }
}

// Override the original restoreItem function
restoreItem = restoreItemWithTracking;
