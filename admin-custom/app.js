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

// Default constants (will be overridden by admin settings if they exist)
const DEFAULT_DEPLOYMENT_STATUS_POLL_INTERVAL = 10000; // 10 seconds
const DEFAULT_DEPLOYMENT_HISTORY_POLL_INTERVAL = 30000; // 30 seconds
const DEFAULT_DEPLOYMENT_TIMEOUT = 600; // 10 minutes in seconds
const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds
const DEFAULT_DEBOUNCE_DELAY = 300; // milliseconds

/**
 * Loads admin settings from localStorage and applies them to global constants
 *
 * Called on app startup to ensure polling intervals use user preferences.
 */
function loadAndApplyAdminSettings() {
  try {
    const stored = localStorage.getItem('admin_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      // Apply settings or use defaults
      window.DEPLOYMENT_STATUS_POLL_INTERVAL = settings.deployment_poll_interval || DEFAULT_DEPLOYMENT_STATUS_POLL_INTERVAL;
      window.DEPLOYMENT_HISTORY_POLL_INTERVAL = settings.deployment_history_poll_interval || DEFAULT_DEPLOYMENT_HISTORY_POLL_INTERVAL;
      window.DEPLOYMENT_TIMEOUT = settings.deployment_timeout || DEFAULT_DEPLOYMENT_TIMEOUT;
      window.FETCH_TIMEOUT = settings.fetch_timeout || DEFAULT_FETCH_TIMEOUT;
      window.DEBOUNCE_DELAY = settings.debounce_delay || DEFAULT_DEBOUNCE_DELAY;
    } else {
      // No settings in localStorage - use defaults
      window.DEPLOYMENT_STATUS_POLL_INTERVAL = DEFAULT_DEPLOYMENT_STATUS_POLL_INTERVAL;
      window.DEPLOYMENT_HISTORY_POLL_INTERVAL = DEFAULT_DEPLOYMENT_HISTORY_POLL_INTERVAL;
      window.DEPLOYMENT_TIMEOUT = DEFAULT_DEPLOYMENT_TIMEOUT;
      window.FETCH_TIMEOUT = DEFAULT_FETCH_TIMEOUT;
      window.DEBOUNCE_DELAY = DEFAULT_DEBOUNCE_DELAY;
    }
  } catch (error) {
    console.warn('Failed to load admin settings, using defaults:', error);
    // Use defaults
    window.DEPLOYMENT_STATUS_POLL_INTERVAL = DEFAULT_DEPLOYMENT_STATUS_POLL_INTERVAL;
    window.DEPLOYMENT_HISTORY_POLL_INTERVAL = DEFAULT_DEPLOYMENT_HISTORY_POLL_INTERVAL;
    window.DEPLOYMENT_TIMEOUT = DEFAULT_DEPLOYMENT_TIMEOUT;
    window.FETCH_TIMEOUT = DEFAULT_FETCH_TIMEOUT;
    window.DEBOUNCE_DELAY = DEFAULT_DEBOUNCE_DELAY;
  }
}

// Initialize and expose deployment state for ES6 modules
window.activeDeployments = activeDeployments;
window.deploymentPollInterval = deploymentPollInterval;
window.historyPollInterval = historyPollInterval;

// Initialize taxonomy arrays on window object to prevent undefined access
// These will be populated by loadTaxonomy() but need to exist before that
window.categories = categories;
window.tags = tags;

// Expose cleanup tracking objects for ES6 modules
window.sortableInstances = sortableInstances;
window.taxonomyAutocompleteCleanup = taxonomyAutocompleteCleanup;

// Expose posts pagination state for ES6 modules
// These will be updated by posts.js module functions
window.currentPage = 1;
window.postsPerPage = 10;

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

/**
 * Initializes Bootstrap-style accordion behavior for settings sections
 *
 * Sets up click handlers to ensure only one accordion section is open at a time.
 * When a section is clicked, all other sections close automatically.
 */
function initSettingsAccordion() {
  const accordion = document.getElementById('settings-accordion');
  if (!accordion) return;

  const accordionItems = accordion.querySelectorAll('.settings-accordion-item');

  accordionItems.forEach(item => {
    const summary = item.querySelector('summary');
    if (!summary) return;

    summary.addEventListener('click', (event) => {
      const isCurrentlyOpen = item.hasAttribute('open');

      // If clicking on a closed item, close all other items first
      if (!isCurrentlyOpen) {
        accordionItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.hasAttribute('open')) {
            otherItem.removeAttribute('open');
          }
        });
      }
    });
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  initAuth();
  handleRouteChange();
  setupUnsavedChangesWarning();
  registerServiceWorker();

  // Initialize settings accordion behavior
  initSettingsAccordion();

  // Load admin settings from localStorage BEFORE starting polling
  // This ensures polling intervals use user preferences instead of defaults
  loadAndApplyAdminSettings();

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
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // First, unregister ALL existing service workers to clear old caches
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Unregistered old service worker');
      }

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('Cleared all caches');

      // Now register the new service worker
      await navigator.serviceWorker.register('/admin-custom/sw.js');
      console.log('Registered new service worker');
    } catch (error) {
      console.error('ServiceWorker operation failed:', error);
    }
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
  // Test mode bypass for E2E tests
  if (localStorage.getItem('TEST_MODE') === 'true') {
    showMainApp({ email: 'test@playwright.dev', user_metadata: { full_name: 'Test User' } });
    return;
  }

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

  // Load site title to update admin header
  if (typeof window.loadSiteTitle === 'function') {
    window.loadSiteTitle();
  }

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
 * @returns {Promise<void>}
 */
async function switchSection(sectionName, updateUrl = true) {
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
    await loadTaxonomy();
  } else if (sectionName === 'settings') {
    // Settings functions are loaded via ES6 modules - check they're available
    // If not ready yet, retry after a short delay
    if (typeof window.loadSettings === 'function') {
      window.loadSettings();
    } else {
      setTimeout(() => {
        if (typeof window.loadSettings === 'function') {
          window.loadSettings();
        }
      }, 100);
    }

    if (typeof window.loadAdminSettings === 'function') {
      window.loadAdminSettings();
    } else {
      setTimeout(() => {
        if (typeof window.loadAdminSettings === 'function') {
          window.loadAdminSettings();
        }
      }, 100);
    }
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
      await loadPages();
    }
  } else if (sectionName === 'posts') {
    // Show posts list view (hide editor if it's open)
    document.getElementById('posts-editor-view').classList.add('hidden');
    document.getElementById('posts-list-view').classList.remove('hidden');
    currentPost = null;
    clearPostDirty();
    // Load posts if not already loaded
    if (allPosts.length === 0) {
      await loadPosts();
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

  // Scroll to top of page when switching sections
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.currentPage = page;
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

        <!-- Rate Limit Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resets</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr class="text-xs">
                <td class="px-3 py-2 font-semibold text-gray-900">${remaining.toLocaleString()}</td>
                <td class="px-3 py-2 font-semibold text-gray-900">${limit.toLocaleString()}</td>
                <td class="px-3 py-2 font-semibold text-gray-900">${minutesUntilReset}m (${timeStr})</td>
              </tr>
            </tbody>
          </table>
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
// currentPage and postsPerPage are now defined on window object (see lines 96-97)
let markdownEditor = null; // EasyMDE instance
let postHasUnsavedChanges = false; // Track unsaved changes in post editor
let settingsHasUnsavedChanges = false; // Track unsaved changes in settings

// Selected taxonomy items state
let selectedCategories = [];
let selectedTags = [];

// ===== ALL POSTS FUNCTIONS MOVED TO MODULE =====
// All post management functions have been fully modularized in:
//   /admin-custom/js/modules/posts.js
// The module is imported and exposed to window in index.html
// Functions are accessed via window.loadPosts(), window.editPost(), etc.

// ===== TRASH MANAGEMENT - Now using ES6 module (js/modules/trash.js) =====
// Functions: loadTrash(), renderTrashList(), restoreItemWithTracking(), permanentlyDeleteItem()
// State variables kept here: allTrashedItems
// The module is imported and exposed to window in index.html

// Keep allTrashedItems as global state for switchSection to check
let allTrashedItems = [];


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

    // ALWAYS load taxonomy first if not loaded (needed for category/tag selects)
    // Must load before ANY posts operations
    if (!categories || categories.length === 0) {
      await loadTaxonomy();
    }

    // Load posts if not loaded yet
    if (allPosts.length === 0) {
      await loadPosts();
    } else {
      // Posts already loaded - just re-render the list
      // But ONLY if taxonomy is loaded
      if (categories && categories.length > 0 && window.renderPostsList) {
        window.renderPostsList();
      }
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

// ===== ALL PAGES FUNCTIONS MOVED TO MODULE =====
// All page management functions have been fully modularized in:
//   /admin-custom/js/modules/pages.js
// The module is imported and exposed to window in index.html
// Functions are accessed via window.loadPages(), window.editPage(), etc.

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

  // Note: Auto-reload of affected lists is handled by deployments.js module

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
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deployed</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
  `;

  mainDeployments.forEach((deployment, index) => {
    let statusIcon, statusColor, statusText, animationClass;

    if (deployment.isActive) {
      // Active deployments
      animationClass = '';

      if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
      } else {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
      }

      const elapsed = Math.floor((new Date() - new Date(deployment.startedAt)) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      html += `
        <tr class="${animationClass}">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="px-4 py-3 font-mono text-gray-500">${timeStr}</td>
          <td class="px-4 py-3 text-gray-400">live</td>
        </tr>
      `;
    } else {
      // Historical deployments (from GitHub)
      animationClass = '';

      if (deployment.status === 'completed') {
        statusIcon = 'fa-check-circle';
        statusColor = 'text-green-600';
        statusText = 'Success';
      } else if (deployment.status === 'failed') {
        statusIcon = 'fa-times-circle';
        statusColor = 'text-red-600';
        statusText = 'Failed';
      } else if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
      } else if (deployment.status === 'pending') {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
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
        <tr class="${animationClass}">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="px-4 py-3 text-right font-mono text-gray-500">${durationStr}</td>
          <td class="px-4 py-3 text-right text-gray-400">${relativeTime}</td>
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

