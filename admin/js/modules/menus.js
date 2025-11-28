/**
 * Menus Module
 *
 * WordPress-style menu management system for Jekyll site navigation.
 * Manages header, mobile, and footer menu configurations with drag-and-drop
 * menu builder interface.
 *
 * Features:
 * - Load menu configurations from backend
 * - Drag-and-drop menu builder with nesting support
 * - Add/edit/delete menu items
 * - Multiple menu item types: category, page, custom, heading, category_dynamic
 * - Automatic save after each operation
 * - Tab switching between menu locations
 *
 * Dependencies:
 * - core/utils.js for escapeHtml() and setButtonLoading()
 * - ui/notifications.js for showError(), showSuccess(), and hideMessages()
 * - Global API_BASE constant
 * - Global state: headerMenu, mobileMenu, footerMenu, currentMenuLocation
 * - Global showModal() and showConfirm() functions
 * - External: Sortable.js library for drag-and-drop
 *
 * @module modules/menus
 */

import { escapeHtml, setButtonLoading } from '../core/utils.js';
import { showError, showSuccess, hideMessages } from '../ui/notifications.js';
import { trackDeployment } from './deployments.js';
import logger from '../core/logger.js';

// Cache configuration
const MENUS_CACHE_KEY = 'admin_menus_cache_v1';

// Global state
window.headerMenu = [];
window.mobileMenu = [];
window.footerMenu = [];
window.currentMenuLocation = 'header';
window.lastSavedState = '';
window.isDirty = false;
window.sortableInstances = { header: null, mobile: null, footer: null };

/**
 * Gets cached menu data
 */
function getCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data } = JSON.parse(cached);
    return data;
  } catch (error) {
    logger.warn('Menus cache read error:', error);
    return null;
  }
}

/**
 * Sets menu cache data
 */
function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    logger.warn('Menus cache write error:', error);
  }
}

/**
 * Clears menu cache
 */
export function clearMenusCache() {
  localStorage.removeItem(MENUS_CACHE_KEY);
}

/**
 * Loads menu data from the backend
 *
 * Fetches menu configurations from the API, updates global state,
 * stores the initial saved state, and renders the menu builder.
 *
 * @throws {Error} If menu load fails
 */
export async function loadMenus() {
  try {
    // Try to load from cache first
    const cachedData = getCache(MENUS_CACHE_KEY);
    if (cachedData) {
      window.headerMenu = cachedData.header_menu || [];
      window.mobileMenu = cachedData.mobile_menu || [];
      window.footerMenu = cachedData.footer_menu || [];

      window.lastSavedState = JSON.stringify({
        header_menu: window.headerMenu,
        mobile_menu: window.mobileMenu,
        footer_menu: window.footerMenu
      });
      window.isDirty = false;

      updateSaveButton();
      switchMenuLocation('header');
      return;
    }

    // Cache miss - fetch from API
    const response = await fetch(`${window.API_BASE}/menus`);
    if (!response.ok) throw new Error('Failed to load menus');

    const data = await response.json();

    window.headerMenu = data.header_menu || [];
    window.mobileMenu = data.mobile_menu || [];
    window.footerMenu = data.footer_menu || [];

    // Cache the data
    setCache(MENUS_CACHE_KEY, {
      header_menu: window.headerMenu,
      mobile_menu: window.mobileMenu,
      footer_menu: window.footerMenu
    });

    // Store initial state as "saved"
    window.lastSavedState = JSON.stringify({
      header_menu: window.headerMenu,
      mobile_menu: window.mobileMenu,
      footer_menu: window.footerMenu
    });
    window.isDirty = false;

    updateSaveButton();
    switchMenuLocation('header');
  } catch (error) {
    showError('Failed to load menus: ' + error.message);
  }
}

/**
 * Switches between menu locations (header, mobile, footer)
 *
 * @param {string} location - One of 'header', 'mobile', 'footer'
 */
export function switchMenuLocation(location) {
  window.currentMenuLocation = location;

  // Update tab buttons
  const headerTab = document.getElementById('tab-header-menu');
  const mobileTab = document.getElementById('tab-mobile-menu');
  const footerTab = document.getElementById('tab-footer-menu');

  if (!headerTab || !mobileTab || !footerTab) return;

  // Remove active class from all
  headerTab.classList.remove('active');
  mobileTab.classList.remove('active');
  footerTab.classList.remove('active');

  // Add active to selected tab
  if (location === 'header') {
    headerTab.classList.add('active');
  } else if (location === 'mobile') {
    mobileTab.classList.add('active');
  } else {
    footerTab.classList.add('active');
  }

  // Update tab content visibility
  const headerContent = document.getElementById('menu-header-tab');
  const mobileContent = document.getElementById('menu-mobile-tab');
  const footerContent = document.getElementById('menu-footer-tab');

  if (headerContent && mobileContent && footerContent) {
    headerContent.classList.add('d-none');
    mobileContent.classList.add('d-none');
    footerContent.classList.add('d-none');

    if (location === 'header') {
      headerContent.classList.remove('d-none');
    } else if (location === 'mobile') {
      mobileContent.classList.remove('d-none');
    } else {
      footerContent.classList.remove('d-none');
    }
  }

  renderMenuBuilder();
}

/**
 * Gets the current menu array based on selected location
 */
function getCurrentMenu() {
  if (window.currentMenuLocation === 'header') {
    return window.headerMenu;
  } else if (window.currentMenuLocation === 'mobile') {
    return window.mobileMenu;
  } else {
    return window.footerMenu;
  }
}

/**
 * Sets the current menu array based on selected location
 */
function setCurrentMenu(menu) {
  if (window.currentMenuLocation === 'header') {
    window.headerMenu = menu;
  } else if (window.currentMenuLocation === 'mobile') {
    window.mobileMenu = menu;
  } else {
    window.footerMenu = menu;
  }
}

/**
 * Marks menus as having unsaved changes
 */
function markDirty() {
  window.isDirty = true;
  updateSaveButton();
}

/**
 * Updates the save button state based on unsaved changes
 */
function updateSaveButton() {
  const saveBtn = document.getElementById('save-btn');
  if (!saveBtn) return;

  const currentState = JSON.stringify({
    header_menu: window.headerMenu,
    mobile_menu: window.mobileMenu,
    footer_menu: window.footerMenu
  });
  const hasChanges = currentState !== window.lastSavedState;

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

/**
 * Renders the menu builder interface
 */
export function renderMenuBuilder() {
  const currentMenu = getCurrentMenu();
  const location = window.currentMenuLocation;

  const listId = `menu-${location}-list`;
  const tbody = document.getElementById(listId);
  const countBadge = document.getElementById(`${location}-menu-count-badge`);

  if (!tbody || !countBadge) return;

  // Remove loading spinner if it exists
  const loadingRow = tbody.querySelector('.menu-loading');
  if (loadingRow) {
    loadingRow.remove();
  }

  // If no menu items, show empty state
  if (currentMenu.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="p-5 text-center text-muted">
          <i class="fas fa-bars fa-3x mb-3 text-secondary"></i>
          <p class="mb-0">No menu items yet. Use the panel on the right to add items.</p>
        </td>
      </tr>
    `;
    countBadge.textContent = '0';
    return;
  }

  // Generate rows with hierarchy
  let rowNumber = 1;
  const rows = [];

  function renderMenuItem(item, index, indent = 0, parentIndex = null) {
    const hasChildren = item.children && item.children.length > 0;
    const isChild = indent > 0;
    const indentPx = indent * 24;

    rows.push(`
      <tr class="small menu-item" data-index="${index}" data-parent="${parentIndex !== null ? parentIndex : ''}" data-indent="${indent}">
        <td class="px-3 py-2 text-muted">${rowNumber++}</td>
        <td class="px-3 py-2">
          <div class="d-flex align-items-center gap-2" style="padding-left: ${indentPx}px">
            ${hasChildren ? `
              <button
                class="menu-expand-btn"
                onclick="window.toggleMenuChildren(${index})"
                title="Expand/collapse children"
              >
                <i class="fas fa-chevron-down"></i>
              </button>
            ` : ''}
            <i class="fas fa-bars text-secondary flex-shrink-0"></i>
            <div class="d-flex flex-column">
              <span class="fw-medium text-dark">${escapeHtml(item.label)}</span>
              <small class="text-muted">
                ${item.type === 'category_dynamic'
                  ? `Dynamic: ${escapeHtml(item.filter || '')}`
                  : escapeHtml(item.url || '-')
                }
              </small>
            </div>
            ${hasChildren ? `<span class="badge bg-secondary ms-2">${item.children.length}</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-2">
          <span class="badge ${getTypeBadgeClass(item.type)}">${item.type}</span>
        </td>
        <td class="px-3 py-2 text-end text-nowrap">
          <button
            onclick="window.editMenuItem(${index})"
            class="btn-icon-edit"
            title="Edit menu item"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="window.deleteMenuItem(${index})"
            class="btn-icon-delete"
            title="Delete menu item"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `);

    // Render children
    if (hasChildren) {
      item.children.forEach((child, childIndex) => {
        renderMenuItem(child, `${index}-${childIndex}`, indent + 1, index);
      });
    }
  }

  currentMenu.forEach((item, index) => {
    renderMenuItem(item, index);
  });

  tbody.innerHTML = rows.join('');

  // Count total items (including children)
  const totalItems = countMenuItems(currentMenu);
  countBadge.textContent = totalItems;

  // Initialize drag-and-drop
  initializeSortable(location);
}

/**
 * Counts total menu items including children
 */
function countMenuItems(items) {
  let count = 0;
  items.forEach(item => {
    count++;
    if (item.children && item.children.length > 0) {
      count += countMenuItems(item.children);
    }
  });
  return count;
}

/**
 * Gets Bootstrap badge class for menu item type
 */
function getTypeBadgeClass(type) {
  const classes = {
    'category': 'bg-primary',
    'category_dynamic': 'bg-info',
    'page': 'bg-success',
    'custom': 'bg-warning',
    'heading': 'bg-secondary'
  };
  return classes[type] || 'bg-secondary';
}

/**
 * Toggles visibility of child menu items
 */
export function toggleMenuChildren(parentIndex) {
  const children = document.querySelectorAll(`[data-parent="${parentIndex}"]`);
  const expandBtn = document.querySelector(`[onclick="window.toggleMenuChildren(${parentIndex})"]`);

  children.forEach(child => {
    child.classList.toggle('d-none');
  });

  if (expandBtn) {
    expandBtn.classList.toggle('collapsed');
  }
}

/**
 * Initializes drag-and-drop for menu items
 */
function initializeSortable(location) {
  const listId = `menu-${location}-list`;
  const tbody = document.getElementById(listId);

  if (!tbody) return;

  // Destroy previous instance
  const sortableKey = location;
  if (window.sortableInstances && window.sortableInstances[sortableKey]) {
    window.sortableInstances[sortableKey].destroy();
  }

  if (typeof Sortable !== 'undefined') {
    if (!window.sortableInstances) {
      window.sortableInstances = { header: null, mobile: null, footer: null };
    }

    window.sortableInstances[sortableKey] = new Sortable(tbody, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: '.fa-bars',
      onEnd: (evt) => {
        const currentMenu = getCurrentMenu();
        const item = currentMenu.splice(evt.oldIndex, 1)[0];
        currentMenu.splice(evt.newIndex, 0, item);
        setCurrentMenu(currentMenu);
        markDirty();
        renderMenuBuilder();
      }
    });
  }
}

/**
 * Shows modal to add a new menu item
 */
export async function showAddMenuItemModal() {
  try {
    const type = document.getElementById('new-item-type').value;

    let item = {
      id: '',
      type: type,
      label: '',
      url: '',
      children: []
    };

    // Get values based on type
    if (type === 'category_dynamic') {
      const filter = document.getElementById('new-item-filter').value.trim();
      const section = document.getElementById('new-item-section').value.trim();
      const label = document.getElementById('new-item-label').value.trim();

      if (!filter || !label) {
        showError('Filter and label are required for dynamic categories');
        return;
      }

      item.id = `dyn-${Date.now()}`;
      item.label = label;
      item.filter = filter;
      if (section) item.section = section;

    } else if (type === 'heading') {
      const label = document.getElementById('new-item-label').value.trim();
      const icon = document.getElementById('new-item-icon').value.trim();

      if (!label) {
        showError('Label is required for headings');
        return;
      }

      item.id = `heading-${Date.now()}`;
      item.label = label;
      if (icon) item.icon = icon;

    } else {
      // category, page, custom
      const label = document.getElementById('new-item-label').value.trim();
      const url = document.getElementById('new-item-url').value.trim();

      if (!label || !url) {
        showError('Label and URL are required');
        return;
      }

      item.id = `${type}-${Date.now()}`;
      item.label = label;
      item.url = url;
    }

    // Check mega_menu / accordion
    const megaMenuCheckbox = document.getElementById('new-item-mega-menu');
    const accordionCheckbox = document.getElementById('new-item-accordion');

    if (megaMenuCheckbox && megaMenuCheckbox.checked) {
      item.mega_menu = true;
    }
    if (accordionCheckbox && accordionCheckbox.checked) {
      item.accordion = true;
    }

    const currentMenu = getCurrentMenu();
    currentMenu.push(item);
    setCurrentMenu(currentMenu);

    renderMenuBuilder();
    hideMessages();
    clearAddItemForm();

    // Auto-save
    await saveMenus();
  } catch (error) {
    logger.error('Error adding menu item:', error);
    showError('Failed to add menu item: ' + error.message);
  }
}

/**
 * Clears the add menu item form
 */
function clearAddItemForm() {
  document.getElementById('new-item-label').value = '';
  document.getElementById('new-item-url').value = '';
  document.getElementById('new-item-filter').value = '';
  document.getElementById('new-item-section').value = '';
  document.getElementById('new-item-icon').value = '';
  const megaMenu = document.getElementById('new-item-mega-menu');
  const accordion = document.getElementById('new-item-accordion');
  if (megaMenu) megaMenu.checked = false;
  if (accordion) accordion.checked = false;
}

/**
 * Updates the add item form based on selected type
 */
export function updateAddItemForm() {
  const type = document.getElementById('new-item-type').value;

  const urlGroup = document.getElementById('add-item-url-group');
  const filterGroup = document.getElementById('add-item-filter-group');
  const sectionGroup = document.getElementById('add-item-section-group');
  const iconGroup = document.getElementById('add-item-icon-group');
  const megaMenuGroup = document.getElementById('add-item-mega-menu-group');
  const accordionGroup = document.getElementById('add-item-accordion-group');

  // Hide all optional fields
  urlGroup.classList.add('d-none');
  filterGroup.classList.add('d-none');
  sectionGroup.classList.add('d-none');
  iconGroup.classList.add('d-none');
  megaMenuGroup.classList.add('d-none');
  accordionGroup.classList.add('d-none');

  // Show relevant fields
  if (type === 'category_dynamic') {
    filterGroup.classList.remove('d-none');
    sectionGroup.classList.remove('d-none');
  } else if (type === 'heading') {
    iconGroup.classList.remove('d-none');
  } else {
    // category, page, custom
    urlGroup.classList.remove('d-none');

    if (type === 'category') {
      megaMenuGroup.classList.remove('d-none');
      accordionGroup.classList.remove('d-none');
    }
  }
}

/**
 * Edits a menu item by index
 */
export async function editMenuItem(index) {
  // TODO: Implement edit modal
  showError('Edit functionality coming soon');
}

/**
 * Deletes a menu item by index
 */
export async function deleteMenuItem(index) {
  try {
    const currentMenu = getCurrentMenu();
    const item = currentMenu[index];

    if (!item) {
      showError('Menu item not found');
      return;
    }

    const hasChildren = item.children && item.children.length > 0;
    let confirmMessage = `Are you sure you want to delete "${item.label}"?`;

    if (hasChildren) {
      confirmMessage = `Delete "${item.label}" and all ${item.children.length} child ${item.children.length === 1 ? 'item' : 'items'}?`;
    }

    const confirmed = await window.showConfirm(confirmMessage);
    if (!confirmed) return;

    currentMenu.splice(index, 1);
    setCurrentMenu(currentMenu);

    renderMenuBuilder();
    hideMessages();

    // Auto-save
    await saveMenus();
  } catch (error) {
    logger.error('Error deleting menu item:', error);
    showError('Failed to delete menu item: ' + error.message);
  }
}

/**
 * Saves menu changes to the backend
 */
export async function saveMenus() {
  const saveBtn = document.getElementById('save-btn');
  setButtonLoading(saveBtn, true, 'Saving...');

  try {
    const response = await fetch(`${window.API_BASE}/menus`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        header_menu: window.headerMenu,
        mobile_menu: window.mobileMenu,
        footer_menu: window.footerMenu
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save');
    }

    const data = await response.json();

    if (data.commitSha) {
      trackDeployment(data.commitSha, 'Update menus', 'menus.yml');
    }

    // Update cache
    setCache(MENUS_CACHE_KEY, {
      header_menu: window.headerMenu,
      mobile_menu: window.mobileMenu,
      footer_menu: window.footerMenu
    });

    // Update saved state
    window.lastSavedState = JSON.stringify({
      header_menu: window.headerMenu,
      mobile_menu: window.mobileMenu,
      footer_menu: window.footerMenu
    });
    window.isDirty = false;

    showSuccess('Menus saved successfully!');
    updateSaveButton();
  } catch (error) {
    showError('Failed to save menus: ' + error.message);
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// Export functions to window for onclick handlers
window.loadMenus = loadMenus;
window.renderMenuBuilder = renderMenuBuilder;
window.switchMenuLocation = switchMenuLocation;
window.toggleMenuChildren = toggleMenuChildren;
window.showAddMenuItemModal = showAddMenuItemModal;
window.updateAddItemForm = updateAddItemForm;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.saveMenus = saveMenus;
