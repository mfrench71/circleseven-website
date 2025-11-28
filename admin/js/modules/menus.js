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
 * - Multiple menu item types: category, page, custom, heading
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
 * Clears both backend and local cache, then reloads menus
 *
 * Sends a DELETE request to the backend to clear the Netlify Blobs cache,
 * clears the local localStorage cache, and reloads fresh menu data.
 */
export async function clearMenuCache() {
  const clearCacheBtn = document.getElementById('clear-cache-btn');

  try {
    setButtonLoading(clearCacheBtn, true, 'Clearing...');
    hideMessages();

    // Clear backend cache via DELETE request
    const response = await fetch(`${window.API_BASE}/menus`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to clear backend cache');
    }

    // Clear local cache
    clearMenusCache();

    // Reload menus with fresh data
    await loadMenus();

    showSuccess('Menu cache cleared and fresh data loaded successfully');
    logger.info('Menu cache cleared successfully');
  } catch (error) {
    logger.error('Error clearing menu cache:', error);
    showError(`Failed to clear menu cache: ${error.message}`);
  } finally {
    setButtonLoading(clearCacheBtn, false, '<i class="fas fa-sync-alt me-2"></i>Clear Cache');
  }
}

/**
 * Loads taxonomy data and populates category dropdown
 * Used for category_ref menu items
 */
async function loadTaxonomy() {
  try {
    const response = await fetch(`${window.API_BASE}/taxonomy`);
    if (!response.ok) throw new Error('Failed to load taxonomy');

    const data = await response.json();
    return data.categoriesTree || [];
  } catch (error) {
    logger.error('Error loading taxonomy:', error);
    showError('Failed to load categories: ' + error.message);
    return [];
  }
}

/**
 * Populates a category dropdown with options from taxonomy
 * Recursively adds parent and child categories
 *
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {Array} categories - Array of category objects from taxonomy
 * @param {number} depth - Current depth for indentation (default 0)
 */
function populateCategoryDropdown(selectElement, categories, depth = 0) {
  if (!selectElement || !Array.isArray(categories)) return;

  categories.forEach(category => {
    if (category.slug) {
      const option = document.createElement('option');
      option.value = category.slug;
      // Add indentation for child categories
      const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(depth);
      option.textContent = indent + category.item;
      selectElement.appendChild(option);

      // Recursively add children
      if (Array.isArray(category.children) && category.children.length > 0) {
        populateCategoryDropdown(selectElement, category.children, depth + 1);
      }
    }
  });
}

// Note: initializeCategoryDropdowns() was removed - categories are now lazy-loaded
// in updateAddItemForm() when user selects category_ref type, and in editMenuItem()
// when opening the edit modal. This prevents issues with taxonomy API not being
// available during page load.

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

    // Note: Categories are now lazy-loaded when user selects category_ref type
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
  const footerTab = document.getElementById('tab-footer-menu');

  if (!headerTab || !footerTab) return;

  // Remove active class from all
  headerTab.classList.remove('active');
  footerTab.classList.remove('active');

  // Add active to selected tab
  if (location === 'header') {
    headerTab.classList.add('active');
  } else {
    footerTab.classList.add('active');
  }

  // Update tab content visibility
  const headerContent = document.getElementById('menu-header-tab');
  const footerContent = document.getElementById('menu-footer-tab');

  if (headerContent && footerContent) {
    // Remove active class from all tabs
    headerContent.classList.remove('active');
    footerContent.classList.remove('active');

    // Add active class to selected tab
    if (location === 'header') {
      headerContent.classList.add('active');
    } else {
      footerContent.classList.add('active');
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
                onclick="window.toggleMenuChildren('${index}')"
                title="Expand/collapse children"
              >
                <i class="fas fa-chevron-down"></i>
              </button>
            ` : ''}
            <i class="fas fa-bars text-secondary flex-shrink-0"></i>
            <div class="d-flex flex-column">
              <span class="fw-medium text-dark">${escapeHtml(item.label)}</span>
              <small class="text-muted">${escapeHtml(item.url || '-')}</small>
            </div>
            ${hasChildren ? `<span class="badge bg-secondary ms-2">${item.children.length}</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-2">
          <span class="badge ${getTypeBadgeClass(item.type)}">${item.type}</span>
        </td>
        <td class="px-3 py-2 text-end text-nowrap">
          <button
            onclick="window.editMenuItem('${index}')"
            class="btn-icon-edit"
            title="Edit menu item"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="window.deleteMenuItem('${index}')"
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
  const expandBtn = document.querySelector(`[onclick="window.toggleMenuChildren('${parentIndex}')"]`);

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
    if (type === 'category_ref') {
      // Category reference from taxonomy
      const categoryRef = document.getElementById('new-item-category-ref').value.trim();
      const label = document.getElementById('new-item-label').value.trim();

      if (!categoryRef) {
        showError('Category selection is required');
        return;
      }

      item.id = `category-ref-${Date.now()}`;
      item.category_ref = categoryRef;
      // Label is optional - will be resolved from taxonomy if not provided
      if (label) {
        item.label = label;
      }
      // URL not needed - will be generated from category_ref

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
  const categoryRef = document.getElementById('new-item-category-ref');
  if (categoryRef) categoryRef.value = '';
  const megaMenu = document.getElementById('new-item-mega-menu');
  const accordion = document.getElementById('new-item-accordion');
  if (megaMenu) megaMenu.checked = false;
  if (accordion) accordion.checked = false;
}

/**
 * Updates the add item form based on selected type
 * Lazy-loads categories when category_ref type is selected
 */
export async function updateAddItemForm() {
  const type = document.getElementById('new-item-type').value;

  const categoryRefGroup = document.getElementById('add-item-category-ref-group');
  const labelGroup = document.querySelector('#new-item-label').parentElement;
  const labelHelp = document.getElementById('add-item-label-help');
  const urlGroup = document.getElementById('add-item-url-group');
  const iconGroup = document.getElementById('add-item-icon-group');
  const megaMenuGroup = document.getElementById('add-item-mega-menu-group');
  const accordionGroup = document.getElementById('add-item-accordion-group');

  // Hide all optional fields
  categoryRefGroup.classList.add('d-none');
  urlGroup.classList.add('d-none');
  iconGroup.classList.add('d-none');
  megaMenuGroup.classList.add('d-none');
  accordionGroup.classList.add('d-none');
  labelHelp.textContent = '';

  // Show relevant fields based on type
  if (type === 'category_ref') {
    // Category from taxonomy - show category picker, hide label and URL
    categoryRefGroup.classList.remove('d-none');
    megaMenuGroup.classList.remove('d-none');
    accordionGroup.classList.remove('d-none');
    labelHelp.textContent = 'Optional - leave blank to use category name from taxonomy';

    // Lazy-load categories when this type is selected
    const addCategoryRef = document.getElementById('new-item-category-ref');
    if (addCategoryRef) {
      // Check if already populated (has more than just the default option)
      if (addCategoryRef.options.length <= 1) {
        const categories = await loadTaxonomy();
        addCategoryRef.innerHTML = '<option value="">-- Select a category --</option>';
        populateCategoryDropdown(addCategoryRef, categories);
        logger.info('Lazy-loaded categories for add form:', categories.length);
      }
    }
  } else if (type === 'heading') {
    iconGroup.classList.remove('d-none');
  } else {
    // category, page, custom - show label and URL
    urlGroup.classList.remove('d-none');

    if (type === 'category') {
      megaMenuGroup.classList.remove('d-none');
      accordionGroup.classList.remove('d-none');
    }
  }
}

/**
 * Finds a menu item by compound index (e.g., "0" or "0-1" or "0-1-0")
 * @param {string|number} index - The index (can be compound like "0-1")
 * @returns {Object|null} - The menu item or null if not found
 */
function findMenuItemByIndex(index) {
  const currentMenu = getCurrentMenu();
  const indexStr = String(index);

  // If it's a simple numeric index (no dash), it's a top-level item
  if (!indexStr.includes('-')) {
    return currentMenu[parseInt(indexStr)];
  }

  // Parse compound index (e.g., "0-1" means currentMenu[0].children[1])
  const parts = indexStr.split('-').map(p => parseInt(p));
  let item = currentMenu[parts[0]];

  // Navigate through children
  for (let i = 1; i < parts.length; i++) {
    if (!item || !item.children) return null;
    item = item.children[parts[i]];
  }

  return item;
}

/**
 * Edits a menu item by index
 */
export async function editMenuItem(index) {
  try {
    const item = findMenuItemByIndex(index);

    if (!item) {
      showError('Menu item not found');
      return;
    }

    // Build edit modal HTML
    const modalHtml = `
      <div class="modal fade" id="editMenuItemModal" tabindex="-1" aria-labelledby="editMenuItemModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="editMenuItemModalLabel">Edit Menu Item</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Item Type</label>
                <select id="edit-item-type" class="form-select" onchange="window.updateEditItemForm()">
                  <option value="category_ref" ${item.type === 'category_ref' ? 'selected' : ''}>Category (from Taxonomy)</option>
                  <option value="category" ${item.type === 'category' ? 'selected' : ''}>Category (Manual)</option>
                  <option value="page" ${item.type === 'page' ? 'selected' : ''}>Page</option>
                  <option value="custom" ${item.type === 'custom' ? 'selected' : ''}>Custom Link</option>
                  <option value="heading" ${item.type === 'heading' ? 'selected' : ''}>Heading</option>
                </select>
              </div>

              <div id="edit-item-category-ref-group" class="mb-3 d-none">
                <label class="form-label fw-semibold">Select Category</label>
                <select id="edit-item-category-ref" class="form-select">
                  <option value="">-- Select a category --</option>
                  <!-- Populated dynamically from taxonomy -->
                </select>
                <small class="form-text text-muted">Category name and URL will be automatically loaded from taxonomy</small>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Label</label>
                <input type="text" id="edit-item-label" class="form-control" value="${escapeHtml(item.label || '')}">
                <small class="form-text text-muted" id="edit-item-label-help"></small>
              </div>

              <div id="edit-item-url-group" class="mb-3">
                <label class="form-label fw-semibold">URL</label>
                <input type="text" id="edit-item-url" class="form-control" value="${escapeHtml(item.url || '')}">
              </div>

              <div id="edit-item-icon-group" class="mb-3 d-none">
                <label class="form-label fw-semibold">Icon (FontAwesome)</label>
                <input type="text" id="edit-item-icon" class="form-control" value="${escapeHtml(item.icon || '')}">
              </div>

              <div id="edit-item-mega-menu-group" class="mb-3 d-none">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="edit-item-mega-menu" ${item.mega_menu ? 'checked' : ''}>
                  <label class="form-check-label" for="edit-item-mega-menu">Enable Mega Menu</label>
                </div>
              </div>

              <div id="edit-item-accordion-group" class="mb-3 d-none">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="edit-item-accordion" ${item.accordion ? 'checked' : ''}>
                  <label class="form-check-label" for="edit-item-accordion">Enable Accordion (Mobile)</label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="window.saveEditedMenuItem('${index}')">
                <i class="fas fa-save me-2"></i>Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById('editMenuItemModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modalElement = document.getElementById('editMenuItemModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Populate category dropdown in edit modal
    const editCategoryRef = document.getElementById('edit-item-category-ref');
    if (editCategoryRef) {
      const categories = await loadTaxonomy();
      editCategoryRef.innerHTML = '<option value="">-- Select a category --</option>';
      populateCategoryDropdown(editCategoryRef, categories);

      // Set category_ref value if editing a category_ref item
      if (item.type === 'category_ref' && item.category_ref) {
        editCategoryRef.value = item.category_ref;
      }
    }

    // Update form visibility based on type
    window.updateEditItemForm();

    // Clean up modal on close
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
    });
  } catch (error) {
    logger.error('Error editing menu item:', error);
    showError('Failed to edit menu item: ' + error.message);
  }
}

/**
 * Updates the edit item form based on selected type
 */
export function updateEditItemForm() {
  const type = document.getElementById('edit-item-type').value;

  const categoryRefGroup = document.getElementById('edit-item-category-ref-group');
  const labelHelp = document.getElementById('edit-item-label-help');
  const urlGroup = document.getElementById('edit-item-url-group');
  const iconGroup = document.getElementById('edit-item-icon-group');
  const megaMenuGroup = document.getElementById('edit-item-mega-menu-group');
  const accordionGroup = document.getElementById('edit-item-accordion-group');

  // Hide all optional fields
  categoryRefGroup.classList.add('d-none');
  urlGroup.classList.add('d-none');
  iconGroup.classList.add('d-none');
  megaMenuGroup.classList.add('d-none');
  accordionGroup.classList.add('d-none');
  if (labelHelp) labelHelp.textContent = '';

  // Show relevant fields based on type
  if (type === 'category_ref') {
    // Category from taxonomy - show category picker, hide URL
    categoryRefGroup.classList.remove('d-none');
    megaMenuGroup.classList.remove('d-none');
    accordionGroup.classList.remove('d-none');
    if (labelHelp) labelHelp.textContent = 'Optional - leave blank to use category name from taxonomy';
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
 * Saves edited menu item changes
 */
export async function saveEditedMenuItem(index) {
  try {
    const item = findMenuItemByIndex(index);

    if (!item) {
      showError('Menu item not found');
      return;
    }

    const type = document.getElementById('edit-item-type').value;
    const label = document.getElementById('edit-item-label').value.trim();

    // Update item with new values
    item.type = type;

    // Clear optional fields first
    delete item.url;
    delete item.icon;
    delete item.mega_menu;
    delete item.accordion;
    delete item.category_ref;
    delete item.label;

    // Set fields based on type
    if (type === 'category_ref') {
      // Category reference from taxonomy
      const categoryRef = document.getElementById('edit-item-category-ref').value.trim();

      if (!categoryRef) {
        showError('Category selection is required');
        return;
      }

      item.category_ref = categoryRef;
      // Label is optional - will be resolved from taxonomy if not provided
      if (label) {
        item.label = label;
      }
      // URL not needed - will be generated from category_ref

      // Check mega_menu / accordion
      const megaMenuCheckbox = document.getElementById('edit-item-mega-menu');
      const accordionCheckbox = document.getElementById('edit-item-accordion');

      if (megaMenuCheckbox && megaMenuCheckbox.checked) {
        item.mega_menu = true;
      }
      if (accordionCheckbox && accordionCheckbox.checked) {
        item.accordion = true;
      }

    } else if (type === 'heading') {
      const icon = document.getElementById('edit-item-icon').value.trim();

      if (!label) {
        showError('Label is required for headings');
        return;
      }

      item.label = label;
      if (icon) item.icon = icon;

    } else {
      // category, page, custom
      const url = document.getElementById('edit-item-url').value.trim();

      if (!label || !url) {
        showError('Label and URL are required');
        return;
      }

      item.label = label;
      item.url = url;

      // Check mega_menu / accordion for categories
      if (type === 'category') {
        const megaMenuCheckbox = document.getElementById('edit-item-mega-menu');
        const accordionCheckbox = document.getElementById('edit-item-accordion');

        if (megaMenuCheckbox && megaMenuCheckbox.checked) {
          item.mega_menu = true;
        }
        if (accordionCheckbox && accordionCheckbox.checked) {
          item.accordion = true;
        }
      }
    }

    // Item was modified in place via reference, just trigger state update
    setCurrentMenu(getCurrentMenu());

    // Close modal
    const modalElement = document.getElementById('editMenuItemModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }

    renderMenuBuilder();
    hideMessages();

    // Auto-save
    await saveMenus();
  } catch (error) {
    logger.error('Error saving edited menu item:', error);
    showError('Failed to save menu item: ' + error.message);
  }
}

/**
 * Deletes a menu item by index
 */
export async function deleteMenuItem(index) {
  try {
    const item = findMenuItemByIndex(index);

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

    // Delete the item from the appropriate array
    const currentMenu = getCurrentMenu();
    const indexStr = String(index);

    if (!indexStr.includes('-')) {
      // Top-level item
      currentMenu.splice(parseInt(indexStr), 1);
    } else {
      // Nested item - navigate to parent's children array
      const parts = indexStr.split('-').map(p => parseInt(p));
      let parentItem = currentMenu[parts[0]];

      // Navigate to the parent of the item to delete
      for (let i = 1; i < parts.length - 1; i++) {
        parentItem = parentItem.children[parts[i]];
      }

      // Delete from parent's children array
      const childIndex = parts[parts.length - 1];
      parentItem.children.splice(childIndex, 1);
    }
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
 * Converts header menu to mobile menu format
 * Replaces mega_menu with accordion styling
 */
function convertHeaderToMobileMenu(headerMenu) {
  if (!headerMenu || !Array.isArray(headerMenu)) {
    return [];
  }

  return headerMenu.map(item => {
    const mobileItem = { ...item };

    // Convert mega_menu to accordion
    if (mobileItem.mega_menu) {
      delete mobileItem.mega_menu;
      mobileItem.accordion = true;
    }

    // Recursively convert children
    if (mobileItem.children && Array.isArray(mobileItem.children)) {
      mobileItem.children = convertHeaderToMobileMenu(mobileItem.children);
    }

    return mobileItem;
  });
}

/**
 * Saves menu changes to the backend
 */
export async function saveMenus() {
  const saveBtn = document.getElementById('save-btn');
  setButtonLoading(saveBtn, true, 'Saving...');

  try {
    // Auto-generate mobile menu from header menu
    const generatedMobileMenu = convertHeaderToMobileMenu(window.headerMenu);

    const response = await fetch(`${window.API_BASE}/menus`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        header_menu: window.headerMenu,
        mobile_menu: generatedMobileMenu,
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

    // Update cache with generated mobile menu
    setCache(MENUS_CACHE_KEY, {
      header_menu: window.headerMenu,
      mobile_menu: generatedMobileMenu,
      footer_menu: window.footerMenu
    });

    // Update saved state with generated mobile menu
    window.lastSavedState = JSON.stringify({
      header_menu: window.headerMenu,
      mobile_menu: generatedMobileMenu,
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
window.getCurrentMenu = getCurrentMenu;
window.renderMenuBuilder = renderMenuBuilder;
window.switchMenuLocation = switchMenuLocation;
window.toggleMenuChildren = toggleMenuChildren;
window.showAddMenuItemModal = showAddMenuItemModal;
window.updateAddItemForm = updateAddItemForm;
window.editMenuItem = editMenuItem;
window.updateEditItemForm = updateEditItemForm;
window.saveEditedMenuItem = saveEditedMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.saveMenus = saveMenus;
