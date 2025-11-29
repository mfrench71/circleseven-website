/**
 * Shared Sidebar Component
 * Renders the admin sidebar navigation with active state support
 */

/**
 * Render sidebar HTML
 * @param {string} activePage - The current active page (e.g., 'dashboard', 'taxonomy', 'posts', etc.)
 */
export function renderSidebar(activePage = 'dashboard') {
  // Determine active states
  const isActive = (page) => activePage === page ? 'active' : '';

  return `
    <!-- Left Sidebar Navigation (below header) -->
    <aside id="admin-sidebar" class="border-end d-flex flex-column">
      <!-- Sidebar Navigation -->
      <nav class="flex-grow-1 overflow-auto py-3">
        <ul class="list-unstyled px-2">
          <!-- Dashboard -->
          <li class="mb-1">
            <a
              href="/admin/"
              class="sidebar-nav-item ${isActive('dashboard')} d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
              title="Dashboard"
            >
              <i class="fas fa-tachometer-alt fs-5" class="sidebar-icon"></i>
              <span class="sidebar-nav-text">Dashboard</span>
            </a>
          </li>

          <!-- Posts (with accordion submenu) -->
          <li class="mb-1">
            <button
              onclick="togglePostsMenu()"
              class="sidebar-nav-item ${isActive('posts') || isActive('taxonomy') || isActive('comments') ? 'active' : ''} d-flex align-items-center justify-content-between w-100 px-3 py-2 text-decoration-none border-0 ${isActive('posts') || isActive('taxonomy') || isActive('comments') ? '' : 'bg-transparent'}"
              style="color: ${isActive('posts') || isActive('taxonomy') || isActive('comments') ? 'white' : '#6b7280'};"
              title="Posts"
            >
              <div class="d-flex align-items-center gap-3">
                <i class="fas fa-file-alt fs-5" class="sidebar-icon"></i>
                <span class="sidebar-nav-text">Posts</span>
              </div>
              <i class="fas fa-chevron-down sidebar-accordion-icon ${isActive('posts') || isActive('taxonomy') || isActive('comments') ? 'expanded' : ''}" id="posts-accordion-icon"></i>
            </button>
            <!-- Accordion Submenu -->
            <ul class="sidebar-submenu ${isActive('posts') || isActive('taxonomy') || isActive('comments') ? 'show' : ''}" id="posts-submenu">
              <li>
                <a href="/admin/posts/" class="sidebar-submenu-item ${isActive('posts')}" title="All Posts">
                  <i class="fas fa-list"></i>
                  <span>All Posts</span>
                </a>
              </li>
              <li>
                <a href="/admin/taxonomy/" class="sidebar-submenu-item ${isActive('taxonomy')}" title="Taxonomy">
                  <i class="fas fa-tags"></i>
                  <span>Taxonomy</span>
                </a>
              </li>
              <li>
                <a href="/admin/comments/" class="sidebar-submenu-item ${isActive('comments')}" title="Comments">
                  <i class="fas fa-comments"></i>
                  <span>Comments</span>
                </a>
              </li>
            </ul>
          </li>

          <!-- Pages -->
          <li class="mb-1">
            <a
              href="/admin/pages/"
              class="sidebar-nav-item ${isActive('pages')} d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
              title="Pages"
            >
              <i class="fas fa-file fs-5" class="sidebar-icon"></i>
              <span class="sidebar-nav-text">Pages</span>
            </a>
          </li>

          <!-- Media Library -->
          <li class="mb-1">
            <a
              href="/admin/media/"
              class="sidebar-nav-item ${isActive('media')} d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
              title="Media Library"
            >
              <i class="fas fa-image fs-5" class="sidebar-icon"></i>
              <span class="sidebar-nav-text">Media Library</span>
            </a>
          </li>

          <!-- Analytics (with accordion submenu) -->
          <li class="mb-1">
            <button
              onclick="toggleAnalyticsMenu()"
              class="sidebar-nav-item ${isActive('visitors') || isActive('content-health') ? 'active' : ''} d-flex align-items-center justify-content-between w-100 px-3 py-2 text-decoration-none border-0 ${isActive('visitors') || isActive('content-health') ? '' : 'bg-transparent'}"
              style="color: ${isActive('visitors') || isActive('content-health') ? 'white' : '#6b7280'};"
              title="Analytics"
            >
              <div class="d-flex align-items-center gap-3">
                <i class="fas fa-chart-line fs-5" class="sidebar-icon"></i>
                <span class="sidebar-nav-text">Analytics</span>
              </div>
              <i class="fas fa-chevron-down sidebar-accordion-icon ${isActive('visitors') || isActive('content-health') ? 'expanded' : ''}" id="analytics-accordion-icon"></i>
            </button>
            <!-- Accordion Submenu -->
            <ul class="sidebar-submenu ${isActive('visitors') || isActive('content-health') ? 'show' : ''}" id="analytics-submenu">
              <li>
                <a href="/admin/analytics/visitors/" class="sidebar-submenu-item ${isActive('visitors')}" title="Visitors">
                  <i class="fas fa-users"></i>
                  <span>Visitors</span>
                </a>
              </li>
              <li>
                <a href="/admin/analytics/content-health/" class="sidebar-submenu-item ${isActive('content-health')}" title="Content Health">
                  <i class="fas fa-heartbeat"></i>
                  <span>Content Health</span>
                </a>
              </li>
            </ul>
          </li>

          <!-- Bin -->
          <li class="mb-1">
            <a
              href="/admin/bin/"
              class="sidebar-nav-item ${isActive('bin')} d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
              title="Bin"
            >
              <i class="fas fa-trash-alt fs-5" class="sidebar-icon"></i>
              <span class="sidebar-nav-text">Bin</span>
            </a>
          </li>

          <!-- Appearance (with accordion submenu) -->
          <li class="mb-1">
            <button
              onclick="toggleAppearanceMenu()"
              class="sidebar-nav-item ${isActive('appearance') || isActive('menus') ? 'active' : ''} d-flex align-items-center justify-content-between w-100 px-3 py-2 text-decoration-none border-0 ${isActive('appearance') || isActive('menus') ? '' : 'bg-transparent'}"
              style="color: ${isActive('appearance') || isActive('menus') ? 'white' : '#6b7280'};"
              title="Appearance"
            >
              <div class="d-flex align-items-center gap-3">
                <i class="fas fa-paint-brush fs-5" class="sidebar-icon"></i>
                <span class="sidebar-nav-text">Appearance</span>
              </div>
              <i class="fas fa-chevron-down sidebar-accordion-icon ${isActive('appearance') || isActive('menus') ? 'expanded' : ''}" id="appearance-accordion-icon"></i>
            </button>
            <!-- Accordion Submenu -->
            <ul class="sidebar-submenu ${isActive('appearance') || isActive('menus') ? 'show' : ''}" id="appearance-submenu">
              <li>
                <a href="/admin/appearance/" class="sidebar-submenu-item ${isActive('appearance')}" title="Fonts">
                  <i class="fas fa-font"></i>
                  <span>Fonts</span>
                </a>
              </li>
              <li>
                <a href="/admin/appearance/menus/" class="sidebar-submenu-item ${isActive('menus')}" title="Menus">
                  <i class="fas fa-bars"></i>
                  <span>Menus</span>
                </a>
              </li>
            </ul>
          </li>

          <!-- Settings -->
          <li class="mb-1">
            <a
              href="/admin/settings/"
              class="sidebar-nav-item ${isActive('settings')} d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
              title="Settings"
            >
              <i class="fas fa-cog fs-5" class="sidebar-icon"></i>
              <span class="sidebar-nav-text">Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- Sidebar Toggle (at bottom) -->
      <div class="border-top p-2">
        <button onclick="toggleSidebar()" class="sidebar-toggle-btn btn btn-link w-100 d-flex align-items-center justify-content-center gap-2 text-secondary text-decoration-none" title="Collapse sidebar">
          <i class="fas fa-angles-left sidebar-collapse-icon fs-5"></i>
          <span class="sidebar-nav-text small">Collapse</span>
        </button>
      </div>
    </aside>
  `;
}

/**
 * Initialize sidebar - mount it to the DOM and restore saved state
 * @param {string} activePage - The current active page
 */
export function initSidebar(activePage = 'dashboard') {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = renderSidebar(activePage);

    // Restore sidebar collapsed state
    const isCollapsed = getSidebarCollapsedState();
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    }

    // Restore accordion states (but only for non-active pages)
    // Active pages will already have their accordion open from renderSidebar
    const accordionState = getAccordionState();

    // If current page is not part of any active accordion, restore saved state
    const isInPostsSection = ['posts', 'taxonomy', 'comments'].includes(activePage);
    const isInAnalyticsSection = ['visitors', 'content-health'].includes(activePage);
    const isInAppearanceSection = ['appearance', 'menus'].includes(activePage);

    if (!isInPostsSection && !isInAnalyticsSection && !isInAppearanceSection) {
      // No active accordion, restore from saved state
      if (accordionState.posts) {
        const submenu = document.getElementById('posts-submenu');
        const icon = document.getElementById('posts-accordion-icon');
        if (submenu && icon) {
          submenu.classList.add('show');
          icon.classList.add('expanded');
        }
      }
      if (accordionState.analytics) {
        const submenu = document.getElementById('analytics-submenu');
        const icon = document.getElementById('analytics-accordion-icon');
        if (submenu && icon) {
          submenu.classList.add('show');
          icon.classList.add('expanded');
        }
      }
      if (accordionState.appearance) {
        const submenu = document.getElementById('appearance-submenu');
        const icon = document.getElementById('appearance-accordion-icon');
        if (submenu && icon) {
          submenu.classList.add('show');
          icon.classList.add('expanded');
        }
      }
    }
  }
}

/**
 * LocalStorage keys for sidebar state
 */
const SIDEBAR_STATE_KEY = 'admin_sidebar_state';
const ACCORDION_STATE_KEY = 'admin_accordion_state';

/**
 * Get accordion state from localStorage
 * @returns {Object} Object with accordion states (e.g., { posts: true, analytics: false })
 */
function getAccordionState() {
  try {
    const saved = localStorage.getItem(ACCORDION_STATE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load accordion state:', error);
    return {};
  }
}

/**
 * Save accordion state to localStorage
 * @param {string} menuName - The menu name (e.g., 'posts', 'analytics', 'appearance')
 * @param {boolean} isOpen - Whether the menu is open
 */
function saveAccordionState(menuName, isOpen) {
  try {
    const state = getAccordionState();
    state[menuName] = isOpen;
    localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save accordion state:', error);
  }
}

/**
 * Get sidebar collapsed state from localStorage
 * @returns {boolean} True if sidebar should be collapsed
 */
function getSidebarCollapsedState() {
  try {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved === 'collapsed';
  } catch (error) {
    console.error('Failed to load sidebar state:', error);
    return false;
  }
}

/**
 * Save sidebar collapsed state to localStorage
 * @param {boolean} isCollapsed - Whether the sidebar is collapsed
 */
function saveSidebarCollapsedState(isCollapsed) {
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, isCollapsed ? 'collapsed' : 'expanded');
  } catch (error) {
    console.error('Failed to save sidebar state:', error);
  }
}

/**
 * Close all accordion menus
 */
function closeAllAccordions() {
  const allSubmenus = document.querySelectorAll('.sidebar-submenu');
  const allIcons = document.querySelectorAll('.sidebar-accordion-icon');

  allSubmenus.forEach(submenu => submenu.classList.remove('show'));
  allIcons.forEach(icon => icon.classList.remove('expanded'));
}

/**
 * Toggle Posts accordion menu
 */
window.togglePostsMenu = function() {
  const submenu = document.getElementById('posts-submenu');
  const icon = document.getElementById('posts-accordion-icon');
  const isOpen = submenu && submenu.classList.contains('show');

  // Close all accordions first
  closeAllAccordions();

  // Clear all accordion states
  saveAccordionState('posts', false);
  saveAccordionState('analytics', false);
  saveAccordionState('appearance', false);

  // If this menu wasn't open, open it
  if (!isOpen && submenu && icon) {
    submenu.classList.add('show');
    icon.classList.add('expanded');
    saveAccordionState('posts', true);
  }
};

/**
 * Toggle Analytics accordion menu
 */
window.toggleAnalyticsMenu = function() {
  const submenu = document.getElementById('analytics-submenu');
  const icon = document.getElementById('analytics-accordion-icon');
  const isOpen = submenu && submenu.classList.contains('show');

  // Close all accordions first
  closeAllAccordions();

  // Clear all accordion states
  saveAccordionState('posts', false);
  saveAccordionState('analytics', false);
  saveAccordionState('appearance', false);

  // If this menu wasn't open, open it
  if (!isOpen && submenu && icon) {
    submenu.classList.add('show');
    icon.classList.add('expanded');
    saveAccordionState('analytics', true);
  }
};

/**
 * Toggle Appearance accordion menu
 */
window.toggleAppearanceMenu = function() {
  const submenu = document.getElementById('appearance-submenu');
  const icon = document.getElementById('appearance-accordion-icon');
  const isOpen = submenu && submenu.classList.contains('show');

  // Close all accordions first
  closeAllAccordions();

  // Clear all accordion states
  saveAccordionState('posts', false);
  saveAccordionState('analytics', false);
  saveAccordionState('appearance', false);

  // If this menu wasn't open, open it
  if (!isOpen && submenu && icon) {
    submenu.classList.add('show');
    icon.classList.add('expanded');
    saveAccordionState('appearance', true);
  }
};

/**
 * Toggle sidebar collapse/expand
 */
window.toggleSidebar = function() {
  const body = document.body;
  // Toggle the collapsed class on body
  body.classList.toggle('sidebar-collapsed');

  // Save the new state
  const isCollapsed = body.classList.contains('sidebar-collapsed');
  saveSidebarCollapsedState(isCollapsed);
};
