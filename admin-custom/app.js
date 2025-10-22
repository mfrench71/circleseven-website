/**
 * Custom Admin Application
 *
 * Full-featured content management system (CMS) for Jekyll static sites.
 * Provides CRUD operations for posts, pages, categories, tags, settings, and media.
 *
 * Core Features:
 * - **Authentication**: Netlify Identity integration with session management
 * - **Taxonomy Management**: Categories and tags with drag-and-drop reordering
 * - **Posts Management**: Blog post creation, editing, and organization
 * - **Pages Management**: Static page editing with protected page support
 * - **Media Library**: Cloudinary integration for image management and uploads
 * - **Trash System**: Soft-delete with restore capabilities
 * - **Settings**: Site configuration (_config.yml) editor with field whitelist
 * - **Deployment Tracking**: Real-time GitHub Actions workflow monitoring
 * - **Dashboard**: Quick actions and site information overview
 *
 * Architecture:
 * - Single Page Application (SPA) with hash-based routing
 * - RESTful API integration with Netlify Functions
 * - GitHub API for file operations and deployment status
 * - Cloudinary for media storage and delivery
 * - Service Worker for offline capability
 * - Unsaved changes tracking with browser warning
 *
 * State Management:
 * - Global state for taxonomy, posts, pages, media, and user session
 * - Dirty state tracking for unsaved changes
 * - Local deployment history with GitHub synchronization
 * - Cached DOM references for performance
 *
 * Dependencies:
 * - Netlify Identity Widget (authentication)
 * - Sortable.js (drag-and-drop)
 * - EasyMDE (markdown editing)
 * - Cloudinary Media Library (image management)
 * - Tailwind CSS (styling)
 * - FontAwesome (icons)
 *
 * @module admin-custom/app
 */

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
let historyPollInterval = null;

// Cleanup tracking
let sortableInstances = { categories: null, tags: null };
let taxonomyAutocompleteCleanup = { categories: null, tags: null };

// API endpoints
const API_BASE = '/.netlify/functions';
window.API_BASE = API_BASE; // Expose for ES6 modules

// Constants
const DEPLOYMENT_STATUS_POLL_INTERVAL = 5000; // 5 seconds
const DEPLOYMENT_HISTORY_POLL_INTERVAL = 10000; // 10 seconds
const DEPLOYMENT_TIMEOUT = 600; // 10 minutes in seconds
const FETCH_TIMEOUT = 30000; // 30 seconds
const DEBOUNCE_DELAY = 300; // milliseconds

// Expose constants for ES6 modules
window.DEPLOYMENT_STATUS_POLL_INTERVAL = DEPLOYMENT_STATUS_POLL_INTERVAL;
window.DEPLOYMENT_HISTORY_POLL_INTERVAL = DEPLOYMENT_HISTORY_POLL_INTERVAL;
window.DEPLOYMENT_TIMEOUT = DEPLOYMENT_TIMEOUT;

// Initialize and expose deployment state for ES6 modules
window.activeDeployments = activeDeployments;
window.deploymentPollInterval = deploymentPollInterval;
window.historyPollInterval = historyPollInterval;

/**
 * Creates a debounced function that delays execution until after wait milliseconds
 *
 * Useful for limiting the rate of function calls on events like scroll, resize, or input.
 * The debounced function will only execute after the specified wait period has elapsed
 * since the last time it was invoked.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = debounce(performSearch, 300);
 * searchInput.addEventListener('input', debouncedSearch);
 */
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

/**
 * Wraps async functions to handle errors and display them to the user
 *
 * Useful for onclick handlers and other event handlers that call async functions.
 * Catches any errors thrown by the function and displays them via showError().
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 *
 * @example
 * button.onclick = asyncHandler(async () => {
 *   await savePost();
 * });
 */
function asyncHandler(fn) {
  return async function(...args) {
    try {
      await fn.apply(this, args);
    } catch (error) {
      console.error('Async handler error:', error);
      showError(error.message || 'An unexpected error occurred');
    }
  };
}

/**
 * Fetches a URL with a configurable timeout
 *
 * Wraps the fetch API to abort requests that take longer than the specified timeout.
 * Uses AbortController to cancel in-flight requests.
 *
 * @param {string} url - URL to fetch
 * @param {Object} [options={}] - Fetch options (method, headers, body, etc.)
 * @param {number} [timeout=FETCH_TIMEOUT] - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} If request times out or fetch fails
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', { method: 'GET' }, 10000);
 */
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}

/**
 * Cleans up all application resources on logout or page hide
 *
 * Stops all polling intervals, destroys Sortable.js instances, removes event listeners,
 * and cleans up markdown editors to prevent memory leaks and ensure clean state transitions.
 * Called automatically on logout and can be called manually when needed.
 */
function cleanupResources() {
  // Stop polling intervals
  stopDeploymentHistoryPolling();
  if (deploymentPollInterval) {
    clearInterval(deploymentPollInterval);
    deploymentPollInterval = null;
  }

  // Clean up Sortable instances
  if (sortableInstances.categories) {
    sortableInstances.categories.destroy();
    sortableInstances.categories = null;
  }
  if (sortableInstances.tags) {
    sortableInstances.tags.destroy();
    sortableInstances.tags = null;
  }

  // Clean up taxonomy autocomplete event listeners
  if (taxonomyAutocompleteCleanup.categories) {
    taxonomyAutocompleteCleanup.categories();
    taxonomyAutocompleteCleanup.categories = null;
  }
  if (taxonomyAutocompleteCleanup.tags) {
    taxonomyAutocompleteCleanup.tags();
    taxonomyAutocompleteCleanup.tags = null;
  }

  // Clean up markdown editors
  cleanupMarkdownEditor();
  cleanupPageMarkdownEditor();
}

/**
 * Sets the loading state of a button with spinner animation
 *
 * When enabled, disables the button, stores its original text, and displays a spinner
 * with custom loading text. When disabled, restores the button to its original state.
 *
 * @param {HTMLButtonElement} button - Button element to update
 * @param {boolean} loading - Whether to show loading state
 * @param {string} [loadingText='Loading...'] - Text to display during loading
 *
 * @example
 * const saveBtn = document.getElementById('save-btn');
 * setButtonLoading(saveBtn, true, 'Saving...');
 * await saveData();
 * setButtonLoading(saveBtn, false);
 */
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

/**
 * Caches frequently-accessed DOM elements for performance optimization
 *
 * Called once on DOMContentLoaded to store references to DOM elements in the global
 * DOM object, avoiding repeated getElementById calls and improving performance.
 */
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

  // Restore any in-progress deployments from GitHub on page load
  restoreActiveDeployments();

  // Start deployment status polling (runs continuously to catch all deployments)
  startDeploymentPolling();

  // Start background polling for deployment history (refreshes every 10s)
  // This captures code pushes and other deployments not triggered via admin
  startDeploymentHistoryPolling();
});

/**
 * Registers the Service Worker for offline capability
 *
 * Attempts to register the service worker at /admin-custom/sw.js if the browser
 * supports Service Workers. Enables offline functionality and caching strategies.
 * Silently logs errors if registration fails.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/admin-custom/sw.js')
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  }
}

/**
 * Sets up browser warning for unsaved changes
 *
 * Adds a beforeunload event listener that prompts the user before leaving the page
 * if there are unsaved changes in posts, settings, or taxonomy. Prevents accidental
 * data loss when closing or refreshing the browser tab.
 *
 * @listens window#beforeunload
 */
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

/**
 * Initializes Netlify Identity authentication
 *
 * Sets up event listeners for authentication state changes (init, login, logout)
 * and initializes the Netlify Identity widget. Manages transition between auth gate
 * and main application based on authentication status.
 *
 * @listens netlifyIdentity#init
 * @listens netlifyIdentity#login
 * @listens netlifyIdentity#logout
 */
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
    cleanupResources();
    showAuthGate();
  });

  // Initialize the widget
  netlifyIdentity.init();
}

/**
 * Displays the authentication gate and hides the main application
 *
 * Shows the login/signup interface when the user is not authenticated.
 */
function showAuthGate() {
  DOM.authGate.classList.add('show-auth');
  DOM.mainApp.classList.add('hidden');
}

/**
 * Shows the main application and initializes user session
 *
 * Called after successful authentication. Hides the auth gate, displays the main app,
 * initializes routing, and updates the last updated timestamp.
 *
 * @param {Object} authenticatedUser - User object from Netlify Identity
 */
function showMainApp(authenticatedUser) {
  user = authenticatedUser;
  DOM.authGate.classList.remove('show-auth');
  DOM.mainApp.classList.remove('hidden');

  // Hide loading indicator
  DOM.loading.classList.add('hidden');

  // Handle routing on login
  handleRouteChange();

  // Load last updated time
  updateLastUpdated();

  // Load GitHub API rate limit status
  updateRateLimit();
}

// ===== TAXONOMY - Now using ES6 module (js/modules/taxonomy.js) =====
// Functions: loadTaxonomy(), switchTaxonomyTab(), renderCategories(), renderTags(),
//            showAddCategoryModal(), addCategory(), editCategory(), deleteCategory(),
//            showAddTagModal(), addTag(), editTag(), deleteTag(), saveTaxonomy()
// Helpers: isItemDirty(), markDirty(), updateSaveButton()
// State variables kept here: categories, tags, lastSavedState, isDirty, sortableInstances
// The module is imported and exposed to window in index.html

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * Converts characters like <, >, &, ", ' to their HTML entity equivalents
 * by using the browser's built-in text-to-HTML conversion.
 *
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe escaped text
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Custom modal dialog
let modalResolve;

/**
 * Shows a modal dialog for text input
 *
 * Displays a modal with a title and input field, returns a promise that resolves with the entered value or null if cancelled. Handles Enter key for confirmation and Escape key for cancellation.
 *
 * @param {string} title - Modal title text
 * @param {string} [defaultValue=""] - Default input value
 *
 * @returns {Promise<string|null>} Promise resolving to entered text or null if cancelled
 */
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

/**
 * Closes the modal dialog and resolves its promise
 *
 * Hides the modal overlay and resolves the promise with the input value or null.
 *
 * @param {boolean} confirmed - Whether the user confirmed or cancelled
 */
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

/**
 * Shows a confirmation dialog
 *
 * Displays a modal confirmation dialog with customizable title, message, button text, and styling.
 *
 * @param {string} message - Confirmation message
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.title="Confirm Delete"] - Dialog title
 * @param {string} [options.buttonText="Delete"] - Confirm button text
 * @param {string} [options.buttonClass="btn-danger"] - Button CSS class
 *
 * @returns {Promise<boolean>} Promise resolving to true if confirmed, false otherwise
 */
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

/**
 * Closes the confirmation dialog and resolves its promise
 *
 * Hides the confirmation overlay and resolves the promise with the user's choice.
 *
 * @param {boolean} confirmed - Whether the user confirmed or cancelled
 */
function closeConfirm(confirmed) {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('hidden');

  if (confirmResolve) {
    confirmResolve(confirmed);
    confirmResolve = null;
  }
}

// Section switching (Dashboard, Taxonomy, Settings)
/**
 * Switches to a different section of the application
 *
 * Updates the URL, page title, navigation highlighting, shows/hides section panels, and loads section data if needed. Supports dashboard, taxonomy, posts, pages, media, trash, and settings sections.
 *
 * @param {string} sectionName - Name of section to switch to
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 */
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
  if (sectionName === 'taxonomy' && (!categories || categories.length === 0)) {
    loadTaxonomy();
  } else if (sectionName === 'settings') {
    loadSettings();
  } else if (sectionName === 'dashboard') {
    // Refresh deployment status immediately when viewing dashboard
    updateDashboardDeployments();
  } else if (sectionName === 'pages') {
    // Show pages list view (hide editor if it's open)
    document.getElementById('pages-editor-view').classList.add('hidden');
    document.getElementById('pages-list-view').classList.remove('hidden');
    currentPage_pages = null;
    clearPageDirty();
    // Load pages if not already loaded
    if (allPages.length === 0) {
      loadPages();
    }
  } else if (sectionName === 'posts') {
    // Show posts list view (hide editor if it's open)
    document.getElementById('posts-editor-view').classList.add('hidden');
    document.getElementById('posts-list-view').classList.remove('hidden');
    currentPost = null;
    clearPostDirty();
    // Load posts if not already loaded
    if (allPosts.length === 0) {
      loadPosts();
    }
  } else if (sectionName === 'media') {
    // Load media if not already loaded
    if (!window.mediaLoaded) {
      loadMedia();
    }
  } else if (sectionName === 'trash') {
    // Refresh trash list when viewing trash section
    loadTrash();
  }
}

// Handle URL path changes (back/forward/refresh)
/**
 * Handles browser URL changes and routes to appropriate section
 *
 * Parses the current URL path and query parameters, switches to the appropriate section, and handles sub-routes (e.g., post/page editing, pagination).
 *
 * @returns {Promise<void>}
 */
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
/**
 * Loads site settings from the backend
 *
 * Fetches settings from the API and populates form fields with the values.
 *
 * @throws {Error} If settings load fails
 */
// ===== SETTINGS - Now using ES6 module (js/modules/settings.js) =====
// Functions: loadSettings(), saveSettings()
// The module is imported and exposed to window in index.html

// Update last updated time on dashboard
/**
 * Updates the last updated timestamp on the dashboard
 *
 * Fetches the most recent successful deployment from GitHub Actions
 * and displays when the site was last built and deployed.
 * Falls back to showing "Unknown" if the fetch fails.
 */
async function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;

  try {
    // Fetch deployment history to get the most recent successful deployment
    const history = await getDeploymentHistory();

    // Find the most recent successful deployment
    const lastDeployment = history.find(d => d.status === 'completed');

    if (lastDeployment && lastDeployment.completedAt) {
      const deployTime = new Date(lastDeployment.completedAt);
      const timeStr = deployTime.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      el.textContent = timeStr;
    } else {
      // No deployment found, show fallback
      el.textContent = 'Unknown';
    }
  } catch (error) {
    console.error('Failed to fetch last updated time:', error);
    el.textContent = 'Unknown';
  }
}

/**
 * Updates the GitHub API rate limit display
 *
 * Fetches current GitHub API rate limit status and displays it with a color-coded
 * progress bar (green <50%, yellow 50-80%, red >80% usage).
 */
async function updateRateLimit() {
  const contentEl = document.getElementById('rate-limit-content');
  if (!contentEl) return;

  try {
    const response = await fetch(`${API_BASE}/rate-limit`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const { limit, remaining, usedPercent, resetDate, minutesUntilReset } = data;

    // Determine progress bar color based on usage
    let barColor = 'bg-green-500'; // <50%
    if (usedPercent >= 80) {
      barColor = 'bg-red-500';
    } else if (usedPercent >= 50) {
      barColor = 'bg-yellow-500';
    }

    // Format reset time
    const resetTime = new Date(resetDate);
    const timeStr = resetTime.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    contentEl.innerHTML = `
      <div class="space-y-3">
        <!-- Progress bar -->
        <div class="relative">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="font-medium text-gray-700">API Usage</span>
            <span class="font-semibold ${usedPercent >= 80 ? 'text-red-600' : usedPercent >= 50 ? 'text-yellow-600' : 'text-green-600'}">${usedPercent}%</span>
          </div>
          <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div class="${barColor} h-full transition-all duration-500 ease-out" style="width: ${usedPercent}%"></div>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div class="text-gray-500 text-xs mb-1">Remaining</div>
            <div class="font-semibold text-gray-900">${remaining.toLocaleString()}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs mb-1">Limit</div>
            <div class="font-semibold text-gray-900">${limit.toLocaleString()}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs mb-1">Resets</div>
            <div class="font-semibold text-gray-900">${minutesUntilReset}m (${timeStr})</div>
          </div>
        </div>

        <!-- Refresh button -->
        <div class="text-center pt-2">
          <button onclick="updateRateLimit()" class="text-sm text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-1">
            <i class="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to fetch rate limit:', error);
    contentEl.innerHTML = `
      <div class="text-center py-4">
        <p class="text-sm text-red-600 mb-2">Failed to load rate limit</p>
        <button onclick="updateRateLimit()" class="text-sm text-teal-600 hover:text-teal-700 font-medium">
          <i class="fas fa-sync-alt mr-1"></i>
          Try Again
        </button>
      </div>
    `;
  }
}

// ===== POSTS MANAGEMENT - Now using ES6 module (js/modules/posts.js) =====
// Functions: loadPosts(), renderPostsList(), sortPostsList(), toggleCategories(), updatePagination(),
//            changePage(), sortPosts(), filterPosts(), debouncedFilterPosts, formatDateShort(),
//            initMarkdownEditor(), cleanupMarkdownEditor(), markPostDirty(), clearPostDirty(),
//            editPost(), showNewPostForm(), setupPostFormChangeListeners(), showPostsList(), savePost(),
//            deletePost(), deletePostFromList(), generateFilename(), formatDateForInput(),
//            populateTaxonomySelects(), initTaxonomyAutocomplete(), addTaxonomyItem(), removeTaxonomyItem(),
//            renderSelectedTaxonomy(), setMultiSelect(), getMultiSelectValues(), initCloudinaryWidget(),
//            selectFeaturedImage(), updateImagePreview(), openImageModal(), closeImageModal(), handleImageModalEscape()
// State variables kept here: allPosts, allPostsWithMetadata, currentPost, currentPage, postsPerPage,
//                            markdownEditor, postHasUnsavedChanges, selectedCategories, selectedTags
// The module is imported and exposed to window in index.html

let allPosts = [];
let allPostsWithMetadata = [];
let currentPost = null;
let currentPage = 1;
const postsPerPage = 10;
let markdownEditor = null; // EasyMDE instance
let postHasUnsavedChanges = false; // Track unsaved changes in post editor
let settingsHasUnsavedChanges = false; // Track unsaved changes in settings

// Load posts list with metadata in one API call
/**
 * Loads all posts with metadata from the backend
 *
 * Fetches posts list with frontmatter metadata in a single API call, processes dates, and renders the posts list.
 *
 * @throws {Error} If posts load fails
 */
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
/**
 * Renders the posts list with filtering, sorting, and pagination
 *
 * Applies search filtering, sorts posts by selected criteria, paginates results, and generates HTML table rows with hierarchical category display.
 */
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
      <tr class="hover:bg-gray-50" data-row-id="cat-row-${rowNumber}">
        <td class="px-4 py-3 text-sm text-gray-500">${rowNumber}</td>
        <td class="px-4 py-3 row-with-actions">
          <div class="font-medium text-gray-900">${escapeHtml(title)}</div>
          <div class="row-actions">
            <span><a href="#" onclick="event.preventDefault(); editPost('${escapeHtml(post.name)}')">Edit</a></span> |
            <span><a href="#" onclick="event.preventDefault(); deletePostFromList('${escapeHtml(post.name)}', '${escapeHtml(post.sha)}')" class="text-red-600 hover:text-red-700">Bin</a></span> |
            <span><a href="${escapeHtml(post.url)}" target="_blank" rel="noopener">View</a></span>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${date}</td>
        <td class="px-4 py-3 text-sm">${categoriesDisplay}</td>
      </tr>
    `;
  }).join('');

  // Update pagination
  updatePagination(totalPosts, startIndex + 1, endIndex, totalPages);
}

// Sort posts list
/**
 * Sorts posts by specified criteria
 *
 * Supports sorting by date (ascending/descending) and title (ascending/descending).
 *
 * @param {Array} posts - Array of post objects to sort
 * @param {string} sortBy - Sort criteria (date-desc, date-asc, title-asc, title-desc)
 *
 * @returns {Array} Sorted array of posts
 */
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
/**
 * Toggles visibility of hierarchical categories in posts list
 *
 * Shows or hides remaining categories when a post has multiple categories in its hierarchy.
 *
 * @param {string} rowId - ID of the table row containing categories to toggle
 */
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
/**
 * Updates pagination UI for posts list
 *
 * Updates page numbers, range display, and enables/disables prev/next buttons.
 *
 * @param {number} total - Total number of posts
 * @param {number} start - Starting index of current page
 * @param {number} end - Ending index of current page
 * @param {number} totalPages - Total number of pages
 */
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
/**
 * Changes the current page in posts pagination
 *
 * Updates the current page number, modifies the URL, re-renders the posts list, and scrolls to top.
 *
 * @param {number} delta - Page change delta (+1 for next, -1 for previous)
 */
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
/**
 * Triggers posts list re-sort based on dropdown selection
 *
 * Resets to first page and re-renders the posts list with new sort order.
 */
function sortPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Filter posts (debounced version will be created in init)
/**
 * Filters posts based on search input
 *
 * Resets to first page and re-renders the posts list with search filter applied.
 */
function filterPosts() {
  currentPage = 1; // Reset to first page
  renderPostsList();
}

// Debounced version for search input
const debouncedFilterPosts = debounce(filterPosts, 300);

// Format date for display
/**
 * Formats a date for display in short format
 *
 * Converts Date object to DD MMM YYYY format (e.g., "21 Oct 2025").
 *
 * @param {Date|string} date - Date to format
 *
 * @returns {string} Formatted date string
 */
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
/**
 * Initializes the EasyMDE markdown editor for posts
 *
 * Creates the EasyMDE instance if it doesn't exist, configures toolbar and status bar, and sets up change tracking.
 */
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

// Clean up markdown editor
/**
 * Cleans up and destroys the markdown editor instance
 *
 * Converts the EasyMDE editor back to a textarea and nullifies the instance to free memory.
 */
function cleanupMarkdownEditor() {
  if (markdownEditor) {
    markdownEditor.toTextArea();
    markdownEditor = null;
  }
}

// Mark post as having unsaved changes
/**
 * Marks the current post as having unsaved changes
 *
 * Sets the postHasUnsavedChanges flag to trigger browser warning on page close.
 */
function markPostDirty() {
  postHasUnsavedChanges = true;
}

// Clear post dirty flag
/**
 * Clears the unsaved changes flag for the current post
 *
 * Resets the postHasUnsavedChanges flag.
 */
function clearPostDirty() {
  postHasUnsavedChanges = false;
}

// Edit post
/**
 * Loads and displays a post for editing
 *
 * Fetches post data from the API, populates the editor form, initializes the markdown editor, sets up change tracking, and updates the URL.
 *
 * @param {string} filename - Name of the post file to edit
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 *
 * @throws {Error} If post load fails
 */
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
    // Ensure editor content is set (use setTimeout to ensure EasyMDE is ready)
    setTimeout(() => {
      if (markdownEditor) {
        markdownEditor.value(currentPost.body || '');
      }
    }, 0);

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
    showError('Failed to load post: ' + error.message);
  }
}

// Show new post form
/**
 * Shows the editor form for creating a new post
 *
 * Clears all form fields, initializes the markdown editor, sets current date, and updates the URL.
 *
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 */
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

  // Initialize markdown editor if needed and clear content
  if (!markdownEditor) {
    initMarkdownEditor();
  }
  // Ensure editor is cleared (use setTimeout to ensure EasyMDE is ready)
  setTimeout(() => {
    if (markdownEditor) {
      markdownEditor.value('');
    }
  }, 0);

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
/**
 * Sets up change listeners on post editor form fields
 *
 * Adds input event listeners to mark the post as dirty when any field changes.
 */
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
/**
 * Returns to the posts list view from the editor
 *
 * Hides the editor, shows the list view, clears currentPost, updates URL, and optionally reloads posts.
 *
 * @returns {Promise<void>}
 */
async function showPostsList() {
  // Check for unsaved changes
  if (postHasUnsavedChanges) {
    const confirmed = await showConfirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }

  // Navigate back instead of pushing new state (makes browser back button work correctly)
  window.history.back();
}

// Save post
/**
 * Saves the current post to the backend
 *
 * Validates required fields, collects form data including frontmatter and content, sends POST/PUT request, handles deployment tracking, and returns to posts list.
 *
 * @param {Event} event - Form submit event
 *
 * @throws {Error} If post save fails
 */
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

      const data = await response.json();
      if (data.commitSha) {
        trackDeployment(data.commitSha, `Create post: ${title}`, filename);
      }

      showSuccess('Post created successfully!');
    }

    // Clear dirty flag after successful save
    clearPostDirty();

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
/**
 * Deletes the currently edited post
 *
 * Shows confirmation dialog, sends delete request to backend, tracks deployment, and returns to posts list.
 *
 * @throws {Error} If post deletion fails
 */
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

    showSuccess('Post moved to trash successfully!');
    await loadPosts();
    showPostsList();
  } catch (error) {
    showError('Failed to move post to trash: ' + error.message);
  }
}

// Delete post from list view (move to trash)
/**
 * Deletes a post from the posts list view
 *
 * Shows confirmation dialog, sends delete request to backend with file SHA, tracks deployment, and refreshes the list.
 *
 * @param {string} filename - Name of the post file to delete
 * @param {string} sha - Git SHA of the file
 *
 * @throws {Error} If post deletion fails
 */
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

    const data = await response.json();
    if (data.commitSha) {
      trackDeployment(data.commitSha, `Move post to trash: ${title}`, filename);
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
/**
 * Generates a Jekyll post filename from title and date
 *
 * Creates a filename in YYYY-MM-DD-slug.md format by slugifying the title.
 *
 * @param {string} title - Post title
 * @param {string} date - Post date in ISO format
 *
 * @returns {string} Generated filename
 */
function generateFilename(title, date) {
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${dateStr}-${slug}.md`;
}

// Helper: Format date for datetime-local input
/**
 * Formats a date for HTML date input
 *
 * Converts Date object or ISO string to YYYY-MM-DD format for input[type="date"].
 *
 * @param {Date|string} dateStr - Date to format
 *
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
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
/**
 * Populates taxonomy autocomplete inputs with available options
 *
 * Fetches current categories and tags from global state and initializes autocomplete for both.
 */
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
/**
 * Initializes autocomplete functionality for taxonomy input
 *
 * Sets up dropdown suggestions, keyboard navigation, and item selection for categories or tags input.
 *
 * @param {string} type - Either "categories" or "tags"
 * @param {Array<string>} availableItems - List of available taxonomy items
 *
 * @returns {Function} Cleanup function to remove event listeners
 */
function initTaxonomyAutocomplete(type, availableItems) {
  const input = document.getElementById(`${type}-input`);
  const suggestionsDiv = document.getElementById(`${type}-suggestions`);
  const selectedDiv = document.getElementById(`${type}-selected`);

  // Clean up previous event listeners if they exist
  if (taxonomyAutocompleteCleanup[type]) {
    taxonomyAutocompleteCleanup[type]();
  }

  let selectedItems = type === 'categories' ? selectedCategories : selectedTags;
  let activeIndex = -1;

  // Handle input changes
  const inputHandler = (e) => {
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
  };

  // Handle keyboard navigation
  const keydownHandler = (e) => {
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
  };

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
  const clickHandler = (e) => {
    const item = e.target.closest('.taxonomy-suggestion-item');
    if (item) {
      addTaxonomyItem(type, item.dataset.value);
    }
  };

  // Close suggestions when clicking outside
  const documentClickHandler = (e) => {
    if (!e.target.closest(`#${type}-input`) && !e.target.closest(`#${type}-suggestions`)) {
      suggestionsDiv.classList.add('hidden');
    }
  };

  // Add event listeners
  input.addEventListener('input', inputHandler);
  input.addEventListener('keydown', keydownHandler);
  suggestionsDiv.addEventListener('click', clickHandler);
  document.addEventListener('click', documentClickHandler);

  // Store cleanup function
  taxonomyAutocompleteCleanup[type] = () => {
    input.removeEventListener('input', inputHandler);
    input.removeEventListener('keydown', keydownHandler);
    suggestionsDiv.removeEventListener('click', clickHandler);
    document.removeEventListener('click', documentClickHandler);
  };
}

// Add taxonomy item (category or tag)
/**
 * Adds a selected taxonomy item to the post/page
 *
 * Adds the item to the selected list if not already present and renders the updated selection.
 *
 * @param {string} type - Either "categories" or "tags"
 * @param {string} value - Taxonomy item to add
 */
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
/**
 * Removes a taxonomy item from the post/page
 *
 * Removes the item from the selected list and renders the updated selection.
 *
 * @param {string} type - Either "categories" or "tags"
 * @param {string} value - Taxonomy item to remove
 */
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
/**
 * Renders the selected taxonomy items with remove buttons
 *
 * Displays selected categories or tags as pills with × buttons for removal.
 *
 * @param {string} type - Either "categories" or "tags"
 */
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
/**
 * Sets the selected values for a taxonomy multiselect
 *
 * Updates the global state for selected categories or tags.
 *
 * @param {string} id - Either "post-categories" or "post-tags"
 * @param {Array<string>} values - Array of selected values
 */
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
/**
 * Gets the currently selected taxonomy values
 *
 * Retrieves selected categories or tags from global state.
 *
 * @param {string} id - Either "post-categories" or "post-tags"
 *
 * @returns {Array<string>} Array of selected values
 */
function getMultiSelectValues(id) {
  const type = id === 'post-categories' ? 'categories' : 'tags';
  return type === 'categories' ? selectedCategories : selectedTags;
}

// Helper: URL validation
/**
 * Validates whether a string is a valid URL
 *
 * Uses the URL constructor to test if the string can be parsed as a valid URL.
 * Useful for validating user-provided URLs before display or storage.
 *
 * @param {string} string - String to validate
 * @returns {boolean} True if valid URL, false otherwise
 *
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not a url') // false
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Initialize Cloudinary Media Library widget
/**
 * Initializes the Cloudinary Media Library widget
 *
 * Creates and configures the Cloudinary widget if not already initialized, using credentials from window.cloudinaryConfig.
 *
 * @returns {Object} Cloudinary widget instance
 */
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
/**
 * Opens Cloudinary widget for selecting a featured image
 *
 * Shows the media library widget and sets the selected image URL to the featured image field.
 */
function selectFeaturedImage() {
  const widget = initCloudinaryWidget();
  if (widget) {
    widget.show();
  } else {
    showError('Cloudinary library is still loading. Please try again in a moment.');
  }
}

// Update image preview
/**
 * Updates the featured image preview
 *
 * Shows or hides the image preview based on whether a valid image URL is entered.
 */
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
/**
 * Opens a full-size image modal
 *
 * Displays the featured image in a modal overlay for full-size viewing.
 *
 * @param {string} url - Image URL to display
 */
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
/**
 * Closes the full-size image modal
 *
 * Hides the image modal overlay.
 */
function closeImageModal() {
  const modalOverlay = document.getElementById('image-modal-overlay');
  modalOverlay.classList.add('hidden');
  document.removeEventListener('keydown', handleImageModalEscape);
}

// Handle Escape key for image modal
/**
 * Handles Escape key press in image modal
 *
 * Closes the modal when user presses Escape key.
 *
 * @param {KeyboardEvent} e - Keyboard event
 *
 * @listens document#keydown
 */
function handleImageModalEscape(e) {
  if (e.key === 'Escape') {
    closeImageModal();
  }
}

// ===== TRASH MANAGEMENT =====
// NOTE: Trash functionality has been moved to ES6 module: /admin-custom/js/modules/trash.js
// The functions below are commented out and replaced by the module implementation.
// See index.html for module loading.

// Keep allTrashedItems as global state for switchSection to check
let allTrashedItems = [];

/*

// Load trashed items (posts and pages)
async function loadTrash() {
  try {
    const response = await fetch(`${API_BASE}/trash`);
    if (!response.ok) throw new Error('Failed to load trash');

    const data = await response.json();
    allTrashedItems = data.items || [];

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
        onclick="restoreItemWithTracking('${escapeHtml(item.name)}', '${escapeHtml(item.sha)}', '${escapeHtml(item.type)}')"
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

    showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored successfully!`);

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
    showError(`Failed to restore ${itemType}: ` + error.message);
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

    const data = await response.json();
    if (data.commitSha) {
      trackDeployment(data.commitSha, `Permanently delete ${itemType}: ${filename}`);
    }

    showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} permanently deleted`);

    // Remove from local array
    allTrashedItems = allTrashedItems.filter(p => p.name !== filename);

    // Re-render trash list
    renderTrashList();
  } catch (error) {
    showError(`Failed to delete ${itemType}: ` + error.message);
  }
}
*/

// Update switchSection to load posts and trash
const originalSwitchSection = switchSection;
switchSection = async function(sectionName, updateUrl = true) {
  originalSwitchSection(sectionName, updateUrl);

  if (sectionName === 'dashboard') {
    // Refresh deployment history when viewing dashboard
    await updateDashboardDeployments();
  } else if (sectionName === 'posts') {
    // Always show the posts list when switching to Posts section
    // Show list view, hide editor view
    document.getElementById('posts-list-view').classList.remove('hidden');
    document.getElementById('posts-editor-view').classList.add('hidden');
    currentPost = null;
    clearPostDirty();

    // Load taxonomy first if not loaded (needed for category/tag selects)
    if (!categories || categories.length === 0) {
      await loadTaxonomy();
    }

    // Load posts if not loaded yet
    if (allPosts.length === 0) {
      await loadPosts();
    }
  } else if (sectionName === 'pages') {
    // Always show the pages list when switching to Pages section
    // Show list view, hide editor view
    document.getElementById('pages-list-view').classList.remove('hidden');
    document.getElementById('pages-editor-view').classList.add('hidden');
    currentPage_pages = null;
    clearPageDirty();

    // Load pages if not loaded yet
    if (allPages.length === 0) {
      await loadPages();
    }
  } else if (sectionName === 'trash' && allTrashedItems.length === 0) {
    await loadTrash();
  } else if (sectionName === 'media' && allMedia.length === 0) {
    await loadMedia();
  }
};

// ===== MEDIA LIBRARY MANAGEMENT - Now using ES6 module (js/modules/media.js) =====
// Functions: loadMedia(), renderMediaGrid(), updateMediaPagination(), changeMediaPage(),
//            filterMedia(), debouncedFilterMedia, copyMediaUrl(), viewMediaFull(), openCloudinaryUpload()
// Helper: isRecentUpload()
// State variables kept here: allMedia, currentMediaPage, mediaPerPage, cloudinaryUploadWidget
// The module is imported and exposed to window in index.html

// ===== PAGES MANAGEMENT - Now using ES6 module (js/modules/pages.js) =====
// Functions: loadPages(), renderPagesList(), filterPages(), debouncedFilterPages,
//            initPageMarkdownEditor(), cleanupPageMarkdownEditor(), markPageDirty(), clearPageDirty(),
//            slugifyPermalink(), autoPopulatePermalink(), editPage(), showNewPageForm(),
//            setupPageFormChangeListeners(), showPagesList(), savePage(), deletePage(),
//            deletePageFromList(), generatePageFilename()
// State variables kept here: allPages, currentPage_pages, pageMarkdownEditor, pageHasUnsavedChanges, permalinkManuallyEdited
// The module is imported and exposed to window in index.html

let allPages = [];
let currentPage_pages = null; // Note: Different from currentPage (posts pagination)
let pageMarkdownEditor = null; // Separate markdown editor for pages
let pageHasUnsavedChanges = false; // Track unsaved changes in page editor
let permalinkManuallyEdited = false; // Track if permalink was manually edited

// Load pages list with metadata
/**
 * Loads all pages from the backend
 *
 * Fetches the list of pages and renders the pages list.
 *
 * @throws {Error} If pages load fails
 */
async function loadPages() {
  try {
    const response = await fetch(`${API_BASE}/pages?metadata=true`);
    if (!response.ok) throw new Error('Failed to load pages');

    const data = await response.json();
    allPages = data.pages || [];

    renderPagesList();
  } catch (error) {
    showError('Failed to load pages: ' + error.message);
  } finally {
    document.getElementById('pages-loading').classList.add('hidden');
  }
}

// Render pages list
/**
 * Renders the pages list with search filtering
 *
 * Filters pages by search term and generates HTML table rows with edit/delete actions.
 */
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
    const isProtected = page.frontmatter?.protected === true;

    // Protected pages don't show delete link
    const deleteLink = isProtected
      ? ''
      : ` | <span><a href="#" onclick="event.preventDefault(); deletePageFromList('${escapeHtml(page.name)}', '${escapeHtml(page.sha)}')" class="text-red-600 hover:text-red-700">Bin</a></span>`;

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
            <span><a href="#" onclick="event.preventDefault(); editPage('${escapeHtml(page.name)}')">Edit</a></span>${deleteLink} |
            <span><a href="${escapeHtml(permalink)}" target="_blank" rel="noopener">View</a></span>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(permalink)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${formattedDate}</td>
      </tr>
    `;
  }).join('');
}

// Filter pages (debounced version)
/**
 * Filters pages based on search input
 *
 * Re-renders the pages list with search filter applied.
 */
function filterPages() {
  renderPagesList();
}

const debouncedFilterPages = debounce(filterPages, 300);

// Initialize page markdown editor
/**
 * Initializes the EasyMDE markdown editor for pages
 *
 * Creates the EasyMDE instance for page content editing if it doesn't exist, and sets up change tracking.
 */
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

// Clean up page markdown editor
/**
 * Cleans up and destroys the page markdown editor instance
 *
 * Converts the EasyMDE editor back to a textarea and nullifies the instance.
 */
function cleanupPageMarkdownEditor() {
  if (pageMarkdownEditor) {
    pageMarkdownEditor.toTextArea();
    pageMarkdownEditor = null;
  }
}

// Mark page as having unsaved changes
/**
 * Marks the current page as having unsaved changes
 *
 * Sets the pageHasUnsavedChanges flag.
 */
function markPageDirty() {
  pageHasUnsavedChanges = true;
}

// Clear page dirty flag
/**
 * Clears the unsaved changes flag for the current page
 *
 * Resets the pageHasUnsavedChanges flag.
 */
function clearPageDirty() {
  pageHasUnsavedChanges = false;
}

// Slugify text for permalinks (convert "About Us" to "/about-us/")
/**
 * Converts text to a URL-friendly slug
 *
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 *
 * @param {string} text - Text to slugify
 *
 * @returns {string} URL-friendly slug
 */
function slugifyPermalink(text) {
  return '/' + text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')     // Remove leading/trailing hyphens
    + '/';
}

// Auto-populate permalink from title
/**
 * Auto-populates permalink field from page title
 *
 * Slugifies the title and sets it as the permalink, adding leading slash.
 */
function autoPopulatePermalink() {
  const titleInput = document.getElementById('page-title');
  const permalinkInput = document.getElementById('page-permalink');

  if (!titleInput || !permalinkInput) return;

  // Only auto-populate if:
  // 1. Permalink is empty, OR
  // 2. Permalink hasn't been manually edited
  if (permalinkInput.value === '' || !permalinkManuallyEdited) {
    const slugified = slugifyPermalink(titleInput.value);
    permalinkInput.value = slugified;
  }
}

// Edit page
/**
 * Loads and displays a page for editing
 *
 * Fetches page data from the API, populates the editor form, initializes the markdown editor, and updates the URL.
 *
 * @param {string} filename - Name of the page file to edit
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 *
 * @throws {Error} If page load fails
 */
async function editPage(filename, updateUrl = true) {
  try {
    // Clear any existing page data first to prevent stale state
    currentPage_pages = null;
    clearPageDirty();
    permalinkManuallyEdited = false; // Reset flag when loading existing page

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
    document.getElementById('page-protected').checked = currentPage_pages.frontmatter.protected === true;

    // Set date field - use existing date or default to current date/time
    const dateValue = currentPage_pages.frontmatter.date || new Date().toISOString();
    document.getElementById('page-date').value = formatDateForInput(dateValue);

    // Initialize markdown editor if needed
    if (!pageMarkdownEditor) {
      initPageMarkdownEditor();
    }
    // Ensure editor content is set (use setTimeout to ensure EasyMDE is ready)
    setTimeout(() => {
      if (pageMarkdownEditor) {
        pageMarkdownEditor.value(currentPage_pages.body || '');
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

// Show new page form
/**
 * Shows the editor form for creating a new page
 *
 * Clears all form fields, initializes the markdown editor, and updates the URL.
 *
 * @param {boolean} [updateUrl=true] - Whether to update browser URL
 */
function showNewPageForm(updateUrl = true) {
  currentPage_pages = null;
  permalinkManuallyEdited = false; // Reset flag for new page

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
  document.getElementById('page-date').value = formatDateForInput(new Date().toISOString());

  // Initialize markdown editor if needed and clear content
  if (!pageMarkdownEditor) {
    initPageMarkdownEditor();
  }
  // Ensure editor is cleared (use setTimeout to ensure EasyMDE is ready)
  setTimeout(() => {
    if (pageMarkdownEditor) {
      pageMarkdownEditor.value('');
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

// Setup change listeners for page form
/**
 * Sets up change listeners on page editor form fields
 *
 * Adds input event listeners to mark the page as dirty when any field changes.
 */
function setupPageFormChangeListeners() {
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
      permalinkManuallyEdited = true;
    });
  }
}

// Show pages list
/**
 * Returns to the pages list view from the editor
 *
 * Hides the editor, shows the list view, clears currentPage, updates URL, and optionally reloads pages.
 *
 * @returns {Promise<void>}
 */
async function showPagesList() {
  // Check for unsaved changes
  if (pageHasUnsavedChanges) {
    const confirmed = await showConfirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }

  // Navigate back instead of pushing new state (makes browser back button work correctly)
  window.history.back();
}

// Save page
/**
 * Saves the current page to the backend
 *
 * Validates required fields, collects form data, sends POST/PUT request, handles deployment tracking, and returns to pages list.
 *
 * @param {Event} event - Form submit event
 *
 * @throws {Error} If page save fails
 */
async function savePage(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-page-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const title = document.getElementById('page-title').value;
    const permalink = document.getElementById('page-permalink').value;
    const layout = document.getElementById('page-layout').value;
    const protected = document.getElementById('page-protected').checked;
    const date = document.getElementById('page-date').value;
    const content = pageMarkdownEditor ? pageMarkdownEditor.value() : document.getElementById('page-content').value;

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
    if (protected) {
      frontmatter.protected = true;
    }

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

      showSuccess('Page updated successfully!');
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

      showSuccess('Page created successfully!');
    }

    // Clear dirty flag after successful save
    clearPageDirty();

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

// Delete page (from editor view - move to trash)
/**
 * Deletes the currently edited page
 *
 * Shows confirmation dialog, validates that protected pages aren't deleted, sends delete request, and returns to pages list.
 *
 * @throws {Error} If page deletion fails
 */
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

    showSuccess('Page moved to trash successfully!');
    await loadPages();
    showPagesList();
  } catch (error) {
    showError('Failed to move page to trash: ' + error.message);
  }
}

// Delete page from list view (move to trash)
/**
 * Deletes a page from the pages list view
 *
 * Shows confirmation dialog, validates protected pages, sends delete request with SHA, tracks deployment, and refreshes the list.
 *
 * @param {string} filename - Name of the page file to delete
 * @param {string} sha - Git SHA of the file
 *
 * @throws {Error} If page deletion fails
 */
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

    showSuccess('Page moved to trash successfully!');

    // Remove from local array
    allPages = allPages.filter(p => p.name !== filename);

    // Re-render the list
    renderPagesList();
  } catch (error) {
    showError('Failed to move page to trash: ' + error.message);
  }
}

// Helper: Generate filename for new page
/**
 * Generates a filename from page title
 *
 * Slugifies the title and adds .md extension.
 *
 * @param {string} title - Page title
 *
 * @returns {string} Generated filename
 */
function generatePageFilename(title) {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}.md`;
}

// ===== DEPLOYMENT STATUS TRACKING - Now using ES6 module (js/modules/deployments.js) =====
// Functions: loadDeploymentHistory(), fetchRecentDeploymentsFromGitHub(), getDeploymentHistory(),
//            saveDeploymentHistory(history), addToDeploymentHistory(deployment), restoreActiveDeployments(),
//            trackDeployment(commitSha, action, itemId = null), showDeploymentBanner(), updateDeploymentBanner(),
//            showDeploymentCompletion(success = true, completedDeployments = []), hideDeploymentBanner(),
//            updateDashboardDeployments(), getRelativeTime(date), startDeploymentHistoryPolling(),
//            stopDeploymentHistoryPolling(), startDeploymentPolling()
// State variables kept here: activeDeployments, deploymentPollInterval, historyPollInterval
// Constants kept here: DEPLOYMENT_STATUS_POLL_INTERVAL, DEPLOYMENT_HISTORY_POLL_INTERVAL, DEPLOYMENT_TIMEOUT
// The module is imported and exposed to window in index.html

// Load deployment history from localStorage
/**
 * Loads deployment history from localStorage
 *
 * Retrieves and parses the stored deployment history.
 */
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
/**
 * Fetches recent GitHub Actions workflow runs
 *
 * Queries the GitHub API for recent deployments and returns the list.
 *
 * @returns {Promise<Array>} Array of recent deployments
 *
 * @throws {Error} If GitHub API request fails
 */
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
/**
 * Gets deployment history, merging localStorage with GitHub data
 *
 * Fetches from GitHub if stale, merges with local history, and limits to most recent deployments.
 *
 * @returns {Promise<Array>} Array of deployment objects
 */
async function getDeploymentHistory() {
  const localHistory = loadDeploymentHistory();
  const githubHistory = await fetchRecentDeploymentsFromGitHub();

  // Create a map of GitHub deployments by commitSha for quick lookup
  const githubMap = new Map(githubHistory.map(d => [d.commitSha, d]));

  // Merge: prioritize GitHub status over localStorage (GitHub is source of truth)
  const merged = localHistory.map(localDep => {
    const githubDep = githubMap.get(localDep.commitSha);
    if (githubDep) {
      // GitHub has this deployment - use GitHub's status (more current)
      githubMap.delete(localDep.commitSha); // Remove from map so we don't add it again
      return githubDep;
    }
    // No GitHub record - keep local (might be old/archived)
    return localDep;
  });

  // Add any remaining GitHub deployments that weren't in localStorage
  githubMap.forEach(deployment => {
    merged.push(deployment);
  });

  // Sort by completedAt/startedAt (most recent first)
  merged.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt));

  return merged;
}

// Save deployment history to localStorage
/**
 * Saves deployment history to localStorage
 *
 * Persists the deployment history array and update timestamp.
 *
 * @param {Array} history - Deployment history array to save
 */
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
/**
 * Adds a new deployment to history
 *
 * Prepends the deployment to history, removes duplicates, limits to 50 items, and persists.
 *
 * @param {Object} deployment - Deployment object to add
 */
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

// Restore active deployments from GitHub on page load
/**
 * Restores in-progress deployments from GitHub on page load
 *
 * Queries GitHub for currently running workflows and adds them to active deployments.
 *
 * @returns {Promise<void>}
 */
async function restoreActiveDeployments() {
  try {
    const githubDeployments = await fetchRecentDeploymentsFromGitHub();

    // Find any in-progress deployments
    const inProgressDeployments = githubDeployments.filter(d =>
      d.status === 'pending' || d.status === 'queued' || d.status === 'in_progress'
    );

    if (inProgressDeployments.length > 0) {
      // Add them to activeDeployments (converting GitHub format to our format)
      inProgressDeployments.forEach(deployment => {
        activeDeployments.push({
          commitSha: deployment.commitSha,
          action: deployment.action,
          itemId: deployment.itemId || null,
          startedAt: new Date(deployment.startedAt),
          status: deployment.status
        });
      });

      // Show banner and start polling if we have active deployments
      if (activeDeployments.length > 0) {
        showDeploymentBanner();
        startDeploymentPolling();
      }
    }
  } catch (error) {
    console.error('Failed to restore active deployments:', error);
  }
}

// Track deployment and start polling
/**
 * Tracks a new deployment
 *
 * Adds deployment to active tracking, shows deployment banner, and adds to history.
 *
 * @param {string} commitSha - Git commit SHA
 * @param {string} action - Description of the action
 * @param {string} [itemId=null] - Optional item identifier
 */
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
/**
 * Shows the deployment status banner
 *
 * Displays the banner with deployment progress information.
 */
function showDeploymentBanner() {
  const header = document.getElementById('deployment-status-header');

  if (header) {
    header.classList.remove('hidden');
    updateDeploymentBanner();
  } else {
    console.error('deployment-status-header element not found in DOM!');
  }
}

// Update deployment status banner message
/**
 * Updates the deployment banner with current status
 *
 * Refreshes the banner content based on active deployments.
 */
function updateDeploymentBanner() {
  const messageEl = document.getElementById('deployment-status-message');
  const timeEl = document.getElementById('deployment-status-time');

  if (activeDeployments.length === 0) return;

  const oldest = activeDeployments[0];
  const elapsed = Math.floor((new Date() - oldest.startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (messageEl) {
    const count = activeDeployments.length;
    const action = oldest.action || 'changes';
    if (count === 1) {
      messageEl.textContent = `Publishing: ${action}`;
    } else {
      messageEl.textContent = `Publishing ${count} changes to GitHub Pages`;
    }
  }

  if (timeEl) {
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Show deployment completion state (success or error)
/**
 * Shows deployment completion message
 *
 * Displays success or failure message in the banner.
 * Automatically reloads posts/pages lists if deployments affected them.
 *
 * @param {boolean} [success=true] - Whether deployment succeeded
 * @param {Array<Object>} [completedDeployments=[]] - Array of completed deployment objects
 */
function showDeploymentCompletion(success = true, completedDeployments = []) {
  const header = document.getElementById('deployment-status-header');
  const messageEl = document.getElementById('deployment-status-message');
  const timeEl = document.getElementById('deployment-status-time');
  const iconEl = header?.querySelector('i');

  if (!header) return;

  // Update banner styling
  if (success) {
    header.className = 'bg-gradient-to-r from-green-500 to-green-600 text-white';
  } else {
    header.className = 'bg-gradient-to-r from-red-500 to-red-600 text-white';
  }

  // Update icon
  if (iconEl) {
    iconEl.className = success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  }

  // Update message
  if (messageEl) {
    messageEl.textContent = success
      ? 'Changes published successfully!'
      : 'Deployment failed';
  }

  // Hide time
  if (timeEl) {
    timeEl.style.display = 'none';
  }

  // Auto-reload affected lists when deployment succeeds
  if (success && completedDeployments.length > 0) {
    const hasPostChanges = completedDeployments.some(d =>
      d.action && d.action.toLowerCase().includes('post')
    );
    const hasPageChanges = completedDeployments.some(d =>
      d.action && d.action.toLowerCase().includes('page')
    );

    // Reload posts list if any post-related deployments completed
    if (hasPostChanges && typeof loadPosts === 'function') {
      console.log('Auto-reloading posts list after deployment completion');
      loadPosts();
    }

    // Reload pages list if any page-related deployments completed
    if (hasPageChanges && typeof loadPages === 'function') {
      console.log('Auto-reloading pages list after deployment completion');
      loadPages();
    }

    // Reload trash list if restore/delete operations completed
    const hasTrashChanges = completedDeployments.some(d =>
      d.action && (d.action.toLowerCase().includes('restore') || d.action.toLowerCase().includes('delete'))
    );
    if (hasTrashChanges && typeof window.loadTrash === 'function') {
      console.log('Auto-reloading trash list after deployment completion');
      window.loadTrash();
    }
  }

  // Auto-hide after 5 seconds for success, 8 seconds for failure
  const hideDelay = success ? 5000 : 8000;
  setTimeout(() => {
    hideDeploymentBanner();
  }, hideDelay);
}

// Hide deployment status banner
/**
 * Hides the deployment status banner
 *
 * Removes the banner from view with fade-out animation.
 */
function hideDeploymentBanner() {
  const header = document.getElementById('deployment-status-header');
  const timeEl = document.getElementById('deployment-status-time');

  if (header) {
    header.classList.add('hidden');
    // Reset to default styling
    header.className = 'hidden bg-gradient-to-r from-teal-500 to-teal-600 text-white animate-gradient-pulse';

    // Reset icon
    const iconEl = header.querySelector('i');
    if (iconEl) {
      iconEl.className = 'fas fa-spinner fa-spin';
    }

    // Show time again
    if (timeEl) {
      timeEl.style.display = '';
    }
  }
}

// Update dashboard deployments card (async to fetch history)
/**
 * Updates the deployment history display on dashboard
 *
 * Fetches recent deployments and renders them in the dashboard widget.
 *
 * @returns {Promise<void>}
 */
async function updateDashboardDeployments() {
  const card = document.getElementById('deployments-card');
  if (!card) return; // Not on dashboard

  const cardContent = card.querySelector('.card-content');
  if (!cardContent) return;

  // Get deployment history
  const history = await getDeploymentHistory();
  const recentHistory = history.slice(0, 10); // Show last 10

  // Get commit SHAs of active deployments to avoid duplicates
  const activeShas = new Set(activeDeployments.map(d => d.commitSha));

  // Combine active and history for table display
  // Show: active deployments + all non-skipped/cancelled from history (excluding duplicates)
  const mainDeployments = [
    ...activeDeployments.map(d => ({ ...d, isActive: true })),
    ...recentHistory
      .filter(d =>
        !activeShas.has(d.commitSha) && // Not already in active deployments
        d.status !== 'skipped' &&
        d.status !== 'cancelled'
      )
      .map(d => ({ ...d, isActive: false }))
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
      // Historical deployments (from GitHub)
      let animationClass = '';

      if (deployment.status === 'completed') {
        statusIcon = 'fa-check-circle';
        statusColor = 'text-green-600';
        statusText = 'Success';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else if (deployment.status === 'failed') {
        statusIcon = 'fa-times-circle';
        statusColor = 'text-red-600';
        statusText = 'Failed';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        rowBg = 'bg-blue-50';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
        rowBg = 'bg-yellow-50';
      } else if (deployment.status === 'pending') {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
        rowBg = 'bg-gray-100';
      } else if (deployment.status === 'cancelled') {
        statusIcon = 'fa-ban';
        statusColor = 'text-yellow-600';
        statusText = 'Cancelled';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else if (deployment.status === 'skipped') {
        statusIcon = 'fa-forward';
        statusColor = 'text-blue-600';
        statusText = 'Skipped';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else {
        statusIcon = 'fa-circle';
        statusColor = 'text-gray-600';
        statusText = deployment.status;
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
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
        <tr class="${rowBg} ${animationClass} hover:bg-gray-100">
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
/**
 * Converts a date to relative time string
 *
 * Returns human-readable relative time (e.g., "2 minutes ago", "3 hours ago").
 *
 * @param {Date} date - Date to convert
 *
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Start background polling for deployment history
/**
 * Starts background polling for deployment history
 *
 * Sets up interval to refresh deployment history every 10 seconds.
 */
function startDeploymentHistoryPolling() {
  if (historyPollInterval) return; // Already polling

  // Run initial update immediately
  const dashboardCard = document.getElementById('deployments-card');
  if (dashboardCard) {
    updateDashboardDeployments();
  }

  // Poll every 10 seconds to refresh history (includes code pushes, not just admin changes)
  // More frequent polling ensures users see deployment status updates quickly
  historyPollInterval = setInterval(async () => {
    // Check for new in-progress deployments from GitHub and add to tracking
    try {
      const githubDeployments = await fetchRecentDeploymentsFromGitHub();
      const inProgressDeployments = githubDeployments.filter(d =>
        d.status === 'pending' || d.status === 'queued' || d.status === 'in_progress'
      );

      // Add any new deployments that aren't already being tracked
      inProgressDeployments.forEach(githubDep => {
        const alreadyTracking = activeDeployments.some(d => d.commitSha === githubDep.commitSha);
        if (!alreadyTracking) {
          activeDeployments.push({
            commitSha: githubDep.commitSha,
            action: githubDep.action,
            itemId: null,
            startedAt: new Date(githubDep.startedAt),
            status: githubDep.status
          });
          showDeploymentBanner();
          startDeploymentPolling();
        }
      });
    } catch (error) {
      console.error('Failed to check for new deployments:', error);
    }

    // Update dashboard deployments (fetches from GitHub via getDeploymentHistory)
    const dashboardCard = document.getElementById('deployments-card');
    if (dashboardCard) {
      await updateDashboardDeployments();
    }
  }, DEPLOYMENT_HISTORY_POLL_INTERVAL);
}

// Stop background history polling
/**
 * Stops deployment history polling
 *
 * Clears the polling interval.
 */
function stopDeploymentHistoryPolling() {
  if (historyPollInterval) {
    clearInterval(historyPollInterval);
    historyPollInterval = null;
  }
}

// Start polling deployment status
/**
 * Starts polling for active deployment status
 *
 * Sets up interval to check deployment status every 5 seconds and handles completion.
 */
function startDeploymentPolling() {
  if (deploymentPollInterval) return; // Already polling

  deploymentPollInterval = setInterval(async () => {
    try {
      // Always poll, even if no active deployments, to catch external deployments
      if (activeDeployments.length === 0) {
        hideDeploymentBanner();
        return;
      }

      // Update time display
      updateDeploymentBanner();

      // Check status of each deployment
      for (let i = activeDeployments.length - 1; i >= 0; i--) {
        const deployment = activeDeployments[i];

        // Timeout after configured duration
        const elapsed = Math.floor((new Date() - deployment.startedAt) / 1000);
        if (elapsed > DEPLOYMENT_TIMEOUT) {
          activeDeployments.splice(i, 1);

          if (activeDeployments.length === 0) {
            showDeploymentCompletion(true, [deployment]);
          }
          continue;
        }

        try {
          const response = await fetch(`${API_BASE}/deployment-status?sha=${deployment.commitSha}`);
          if (!response.ok) {
            console.warn(`Deployment status check failed: ${response.status}`);
            continue;
          }

          const data = await response.json();

          // Update deployment status
          deployment.status = data.status;
          deployment.updatedAt = new Date();
          updateDashboardDeployments();

          if (data.status === 'completed') {
            // Deployment successful
            addToDeploymentHistory(deployment);
            activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            // Only update banner when ALL deployments are complete
            if (activeDeployments.length === 0) {
              showDeploymentCompletion(true, [deployment]);
            }
          } else if (data.status === 'failed') {
            // Deployment failed
            addToDeploymentHistory(deployment);
            activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            if (activeDeployments.length === 0) {
              showDeploymentCompletion(false, [deployment]);
            }
          } else if (data.status === 'cancelled' || data.status === 'skipped') {
            // Deployment cancelled or skipped (superseded by newer commit)
            addToDeploymentHistory(deployment);
            activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            // Don't show error for cancelled/skipped - this is normal when multiple changes are queued
            // The newer deployment will include all changes from this one
            if (activeDeployments.length === 0) {
              hideDeploymentBanner();
            }
          }
          // pending, queued, in_progress continue polling
        } catch (error) {
          console.error('Failed to check deployment status:', error);
        }
      }
    } catch (error) {
      console.error('Error in deployment polling interval:', error);
      // Don't stop polling even on error
    }
  }, DEPLOYMENT_STATUS_POLL_INTERVAL);
}

// NOTE: restoreItemWithTracking has been moved to ES6 module
// See /admin-custom/js/modules/trash.js and index.html for module loading

/*
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

    showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored successfully!`);

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
    showError(`Failed to restore ${itemType}: ` + error.message);
  }
}

// Override the original restoreItem function
restoreItem = restoreItemWithTracking;
*/
