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
 * - **Bin System**: Soft-delete with restore capabilities
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
 * - Bootstrap 5 (styling)
 * - FontAwesome (icons)
 *
 * @module admin/app
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

// GitHub repository
const GITHUB_REPO = 'mfrench71/circleseven-website';
window.GITHUB_REPO = GITHUB_REPO; // Expose for ES6 modules

// Default constants (will be overridden by admin settings if they exist)
const DEFAULT_DEPLOYMENT_STATUS_POLL_INTERVAL = 10000; // 10 seconds
const DEFAULT_DEPLOYMENT_HISTORY_POLL_INTERVAL = 30000; // 30 seconds
const DEFAULT_DEPLOYMENT_TIMEOUT = 600; // 10 minutes in seconds
const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds
const DEFAULT_DEBOUNCE_DELAY = 300; // milliseconds
const MAX_DEPLOYMENT_HISTORY = 50; // Maximum deployments to keep in localStorage

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
    logger.warn('Failed to load admin settings, using defaults:', error);
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
      logger.error('Async handler error:', error);
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

  // Note: Markdown editor cleanup is handled by individual edit pages
  // via their own 'unload' event listeners. Edit pages don't load app.js.
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
  sectionBin: null,
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
  DOM.sectionBin = document.getElementById('section-bin');
  DOM.sectionSettings = document.getElementById('section-settings');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // All admin pages now use standalone initialization via ES6 modules
  // app.js only needs to load admin settings for all pages
  // Individual pages handle their own auth, routing, and initialization
  loadAndApplyAdminSettings();
});

/**
 * Registers the Service Worker for offline capability
 *
 * Attempts to register the service worker at /admin/sw.js if the browser
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
        logger.log('Unregistered old service worker');
      }

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.log('Cleared all caches');

      // Now register the new service worker
      await navigator.serviceWorker.register('/admin/sw.js');
      logger.log('Registered new service worker');
    } catch (error) {
      logger.error('ServiceWorker operation failed:', error);
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
  // Check for test mode via URL parameter or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get('test') === 'true' || localStorage.getItem('TEST_MODE') === 'true';

  if (testMode) {
    localStorage.setItem('TEST_MODE', 'true');
    showMainApp({ email: 'test@localhost.dev', user_metadata: { full_name: 'Test User' } });
    return;
  }

  // Guard against Netlify Identity not being loaded (CSP issues, etc.)
  if (typeof netlifyIdentity === 'undefined') {
    logger.error('Netlify Identity not loaded - cannot initialize auth');
    showAuthGate();
    return;
  }

  let initFired = false;

  netlifyIdentity.on('init', user => {
    initFired = true;
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

  // Initialize the widget (wrap in try-catch for CSP issues)
  try {
    netlifyIdentity.init();
  } catch (error) {
    logger.error('Failed to initialize Netlify Identity:', error);
    showAuthGate();
    return;
  }

  // Fallback: if init event doesn't fire within 2 seconds, check currentUser manually
  setTimeout(() => {
    if (!initFired) {
      try {
        const user = netlifyIdentity.currentUser();
        if (user) {
          showMainApp(user);
        } else {
          showAuthGate();
        }
      } catch (error) {
        logger.error('Failed to check current user:', error);
        showAuthGate();
      }
    }
  }, 2000);
}

/**
 * Displays the authentication gate and hides the main application
 *
 * Shows the login/signup interface when the user is not authenticated.
 */
function showAuthGate() {
  DOM.authGate.classList.add('show-auth');
  DOM.mainApp.classList.add('d-none');
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
  DOM.mainApp.classList.remove('d-none');

  // Initialize shared components (header and sidebar)
  if (typeof window.initHeader === 'function') {
    window.initHeader();
  }
  if (typeof window.initSidebar === 'function') {
    window.initSidebar('dashboard');
  }

  // Hide loading indicator
  DOM.loading.classList.add('d-none');

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

// Taxonomy functions moved to js/modules/taxonomy.js

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

/**
 * Shows a modal dialog for text input using Bootstrap Modal
 *
 * Displays a modal with a title and input field, returns a promise that resolves with the entered value or null if cancelled. Handles Enter key for confirmation.
 *
 * @param {string} title - Modal title text
 * @param {string} [defaultValue=""] - Default input value
 *
 * @returns {Promise<string|null>} Promise resolving to entered text or null if cancelled
 */
function showModal(title, defaultValue = '') {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('inputModal');
    if (!modalEl) {
      logger.error('inputModal element not found');
      resolve(null);
      return;
    }

    const modal = new bootstrap.Modal(modalEl);
    const titleEl = document.getElementById('inputModalLabel');
    const input = document.getElementById('modal-input');
    const saveBtn = document.getElementById('modal-save-btn');

    // Set title and input value
    if (titleEl) titleEl.textContent = title;
    if (input) {
      input.value = defaultValue;
    }

    // Remove old event listeners by cloning the save button
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    // Handle save button click
    newSaveBtn.addEventListener('click', () => {
      modal.hide();
      resolve(input ? input.value : null);
    });

    // Handle Enter key in input
    if (input) {
      const handleEnter = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          modal.hide();
          resolve(input.value);
          input.removeEventListener('keypress', handleEnter);
        }
      };
      input.addEventListener('keypress', handleEnter);
    }

    // Handle cancel/close
    const handleCancel = () => {
      resolve(null);
      modalEl.removeEventListener('hidden.bs.modal', handleCancel);
    };
    modalEl.addEventListener('hidden.bs.modal', handleCancel, { once: true });

    // Show modal and focus input
    modal.show();

    // Focus and select input after modal is shown
    modalEl.addEventListener('shown.bs.modal', () => {
      if (input) {
        input.focus();
        input.select();
      }
    }, { once: true });
  });
}

/**
 * Shows a confirmation dialog using Bootstrap Modal
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
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) {
      logger.error('confirmModal element not found');
      resolve(false);
      return;
    }

    const modal = new bootstrap.Modal(modalEl);
    const titleEl = document.getElementById('confirmModalLabel');
    const messageEl = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-button');

    // Set title (default to "Confirm Delete")
    if (titleEl) titleEl.textContent = options.title || 'Confirm Delete';

    // Set message
    if (messageEl) messageEl.textContent = message;

    // Set button text and class (default to red Delete button)
    if (confirmBtn) {
      confirmBtn.textContent = options.buttonText || 'Delete';
      confirmBtn.className = options.buttonClass || 'btn btn-danger';
    }

    // Remove old event listeners by cloning the confirm button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Handle confirm button click
    newConfirmBtn.addEventListener('click', () => {
      modal.hide();
      resolve(true);
    });

    // Handle cancel/close
    const handleCancel = () => {
      resolve(false);
      modalEl.removeEventListener('hidden.bs.modal', handleCancel);
    };
    modalEl.addEventListener('hidden.bs.modal', handleCancel, { once: true });

    // Show modal
    modal.show();
  });
}

/**
 * Toggles the sidebar between expanded and collapsed (icon-only) states
 *
 * Adds/removes the 'collapsed' class from the sidebar element to trigger CSS transitions.
 * In collapsed state, the sidebar shows only icons and hides all text labels.
 */
function toggleSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

/**
 * Toggles a submenu's visibility and rotates its chevron icon
 *
 * Shows/hides the submenu with a slide animation and rotates the chevron indicator.
 *
 * @param {string} menuName - Name of the submenu to toggle (e.g., 'taxonomy')
 */
function toggleSubmenu(menuName) {
  const submenu = document.getElementById(`${menuName}-submenu`);
  const chevron = document.getElementById(`${menuName}-chevron`);

  if (submenu) {
    submenu.classList.toggle('d-none');
  }

  if (chevron) {
    // Rotate chevron when submenu is open
    const isOpen = submenu && !submenu.classList.contains('d-none');
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

// Expose functions globally for onclick handlers
window.toggleSidebar = toggleSidebar;
window.toggleSubmenu = toggleSubmenu;
window.showModal = showModal;
window.showConfirm = showConfirm;
window.switchSection = switchSection;

// Section switching (Dashboard, Taxonomy, Settings)
/**
 * Switches to a different section of the application
 *
 * Updates the URL, page title, navigation highlighting, shows/hides section panels, and loads section data if needed. Supports dashboard, taxonomy, posts, pages, media, bin, and settings sections.
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
    const newPath = sectionName === 'dashboard' ? '/admin/' : `/admin/${sectionName}`;
    window.history.pushState({ section: sectionName }, '', newPath);
  }

  // Update page title based on section
  const titleMap = {
    dashboard: 'Dashboard',
    taxonomy: 'Taxonomy',
    posts: 'Posts',
    pages: 'Pages',
    media: 'Media Library',
    bin: 'Bin',
    settings: 'Settings'
  };
  const sectionTitle = titleMap[sectionName] || 'Admin';
  document.title = `${sectionTitle} - Admin`;

  // Update sidebar navigation items (WordPress-style left sidebar)
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Map bin section to correct sidebar ID
  const sidebarId = sectionName === 'bin' ? 'sidebar-nav-bin' : `sidebar-nav-${sectionName}`;
  const activeNav = document.getElementById(sidebarId);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Update section panels
  document.querySelectorAll('.section-panel').forEach(panel => {
    panel.classList.add('d-none');
  });

  const sectionEl = document.getElementById(`section-${sectionName}`);
  if (sectionEl) {
    sectionEl.classList.remove('d-none');
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
    document.getElementById('pages-editor-view').classList.add('d-none');
    document.getElementById('pages-list-view').classList.remove('d-none');
    currentPage_pages = null;
    clearPageDirty();
    // Load pages if not already loaded
    if (allPages.length === 0) {
      await loadPages();
    }
  } else if (sectionName === 'posts') {
    // Show posts list view (hide editor if it's open)
    document.getElementById('posts-editor-view').classList.add('d-none');
    document.getElementById('posts-list-view').classList.remove('d-none');
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
  } else if (sectionName === 'bin') {
    // Refresh bin list when viewing bin section
    loadBin();
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
  // /admin/ -> dashboard
  // /admin/posts -> posts
  // /admin/posts/edit/filename -> posts (with editor open)
  // /admin/posts?page=2 -> posts (with pagination)
  let section = 'dashboard';

  if (pathParts.length >= 2 && pathParts[0] === 'admin') {
    const requestedSection = pathParts[1];
    const validSections = ['dashboard', 'taxonomy', 'posts', 'pages', 'media', 'bin', 'settings'];
    if (validSections.includes(requestedSection)) {
      section = requestedSection;
    }
  }

  // Switch section without updating URL (to avoid loop)
  await switchSection(section, false);

  // Handle posts section sub-routes
  if (section === 'posts' && pathParts.length >= 3) {
    if (pathParts[2] === 'new') {
      // /admin/posts/new
      showNewPostForm(false); // Don't update URL, we're already there
    } else if (pathParts[2] === 'edit' && pathParts.length >= 4) {
      // /admin/posts/edit/filename
      const filename = decodeURIComponent(pathParts.slice(3).join('/'));
      if (filename) {
        editPost(filename, false); // Don't update URL, we're already there
      }
    }
  } else if (section === 'posts' && searchParams.has('page')) {
    // /admin/posts?page=2
    const page = parseInt(searchParams.get('page'), 10);
    if (page > 0) {
      window.currentPage = page;
      renderPostsList();
    }
  }

  // Handle pages section sub-routes
  if (section === 'pages' && pathParts.length >= 3) {
    if (pathParts[2] === 'new') {
      // /admin/pages/new
      showNewPageForm(false); // Don't update URL, we're already there
    } else if (pathParts[2] === 'edit' && pathParts.length >= 4) {
      // /admin/pages/edit/filename
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

// Settings functions moved to js/modules/settings.js

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
    logger.error('Failed to fetch last updated time:', error);
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
    let barColor = 'bg-success'; // <50%
    if (usedPercent >= 80) {
      barColor = 'bg-danger';
    } else if (usedPercent >= 50) {
      barColor = 'bg-warning';
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
          <div class="d-flex align-items-center justify-content-between text-sm mb-1">
            <span class="fw-medium text-dark">API Usage</span>
            <span class="fw-semibold ${usedPercent >= 80 ? 'text-danger' : usedPercent >= 50 ? 'text-warning' : 'text-success'}">${usedPercent}%</span>
          </div>
          <div class="w-100 bg-light rounded overflow-hidden" style="height: 1rem;">
            <div class="${barColor} h-100 transition" style="width: ${usedPercent}%"></div>
          </div>
        </div>

        <!-- Rate Limit Table -->
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="table-light">
              <tr>
                <th class="text-start small text-muted text-uppercase">Remaining</th>
                <th class="text-start small text-muted text-uppercase">Limit</th>
                <th class="text-start small text-muted text-uppercase">Resets</th>
              </tr>
            </thead>
            <tbody>
              <tr class="small">
                <td class="fw-semibold">${remaining.toLocaleString()}</td>
                <td class="fw-semibold">${limit.toLocaleString()}</td>
                <td class="fw-semibold">${minutesUntilReset}m (${timeStr})</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Refresh button -->
        <div class="text-center pt-2">
          <button onclick="updateRateLimit()" class="btn btn-link text-primary small fw-medium d-inline-flex align-items-center gap-1">
            <i class="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    logger.error('Failed to fetch rate limit:', error);
    contentEl.innerHTML = `
      <div class="text-center py-4">
        <p class="small text-danger mb-2">Failed to load rate limit</p>
        <button onclick="updateRateLimit()" class="btn btn-link text-primary small fw-medium">
          <i class="fas fa-sync-alt me-1"></i>
          Try Again
        </button>
      </div>
    `;
  }
}

// Posts management moved to js/modules/posts.js
let allPosts = [];
let allPostsWithMetadata = [];
let currentPost = null;
let markdownEditor = null;
let postHasUnsavedChanges = false;
let settingsHasUnsavedChanges = false;
let selectedCategories = [];
let selectedTags = [];

// Bin management moved to js/modules/bin.js
let allBinnedItems = [];


// Update switchSection to load posts and bin
const originalSwitchSection = switchSection;
switchSection = async function(sectionName, updateUrl = true) {
  originalSwitchSection(sectionName, updateUrl);

  if (sectionName === 'dashboard') {
    // Refresh deployment history when viewing dashboard
    await updateDashboardDeployments();
  } else if (sectionName === 'posts') {
    // Always show the posts list when switching to Posts section
    // Show list view, hide editor view
    document.getElementById('posts-list-view').classList.remove('d-none');
    document.getElementById('posts-editor-view').classList.add('d-none');
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
    document.getElementById('pages-list-view').classList.remove('d-none');
    document.getElementById('pages-editor-view').classList.add('d-none');
    currentPage_pages = null;
    clearPageDirty();

    // Load pages if not loaded yet
    if (allPages.length === 0) {
      await loadPages();
    }
  } else if (sectionName === 'bin' && allBinnedItems.length === 0) {
    await loadBin();
  } else if (sectionName === 'media' && allMedia.length === 0) {
    await loadMedia();
  }
};

// Update window reference to the new switchSection
window.switchSection = switchSection;

// Media library management moved to js/modules/media.js

// Pages management moved to js/modules/pages.js
let allPages = [];
let currentPage_pages = null;
let pageMarkdownEditor = null;
let pageHasUnsavedChanges = false;
let permalinkManuallyEdited = false;

// NOTE: Deployment tracking has been moved to ES6 module
// See /admin/js/modules/deployments.js for deployment tracking functions
// Functions exposed via index.html module imports

// NOTE: restoreItemWithTracking has been moved to ES6 module
// See /admin/js/modules/bin.js and index.html for module loading

