/**
 * Taxonomy Module
 *
 * Manages categories and tags taxonomy with CRUD operations, drag-and-drop reordering,
 * and automatic saving functionality.
 *
 * Features:
 * - Load categories and tags from backend
 * - Add, edit, and delete categories and tags
 * - Drag-and-drop reordering with Sortable.js
 * - Automatic save after each operation
 * - Dirty state tracking for unsaved changes
 * - Tab switching between categories and tags
 *
 * Dependencies:
 * - core/utils.js for escapeHtml() and setButtonLoading()
 * - ui/notifications.js for showError(), showSuccess(), and hideMessages()
 * - Global API_BASE constant
 * - Global state: categories, tags, lastSavedState, isDirty, sortableInstances
 * - Global showModal() and showConfirm() functions
 * - Global trackDeployment() function
 * - External: Sortable.js library for drag-and-drop
 *
 * @module modules/taxonomy
 */

import { escapeHtml, setButtonLoading } from '../core/utils.js';
import { showError, showSuccess, hideMessages } from '../ui/notifications.js';

// Cache configuration
const TAXONOMY_CACHE_KEY = 'admin_taxonomy_cache';

/**
 * Gets cached taxonomy data
 */
function getCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data } = JSON.parse(cached);
    return data;
  } catch (error) {
    console.warn('Taxonomy cache read error:', error);
    return null;
  }
}

/**
 * Sets taxonomy cache data
 */
function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Taxonomy cache write error:', error);
  }
}

/**
 * Clears taxonomy cache
 */
export function clearTaxonomyCache() {
  localStorage.removeItem(TAXONOMY_CACHE_KEY);
}

/**
 * Loads taxonomy data from the backend
 *
 * Fetches categories and tags from the API, updates global state arrays,
 * stores the initial saved state, and renders both lists.
 *
 * @throws {Error} If taxonomy load fails
 *
 * @example
 * import { loadTaxonomy } from './modules/taxonomy.js';
 * await loadTaxonomy();
 */
export async function loadTaxonomy() {
  try {
    // Try to load from cache first
    const cachedData = getCache(TAXONOMY_CACHE_KEY);
    if (cachedData) {
      // Flat arrays for backwards compatibility
      window.categories = cachedData.categories || [];
      window.tags = cachedData.tags || [];

      // Hierarchical structures for tree view UI
      window.categoriesTree = cachedData.categoriesTree || [];
      window.tagsTree = cachedData.tagsTree || [];

      // Store initial state as "saved"
      window.lastSavedState = JSON.stringify({
        categories: window.categories,
        tags: window.tags,
        categoriesTree: window.categoriesTree,
        tagsTree: window.tagsTree
      });
      window.isDirty = false;

      renderCategories();
      renderTags();
      updateSaveButton();
      return;
    }

    // Cache miss - fetch from API
    const response = await fetch(`${window.API_BASE}/taxonomy`);
    if (!response.ok) throw new Error('Failed to load taxonomy');

    const data = await response.json();

    // Flat arrays for backwards compatibility
    window.categories = data.categories || [];
    window.tags = data.tags || [];

    // Hierarchical structures for future tree view UI
    window.categoriesTree = data.categoriesTree || [];
    window.tagsTree = data.tagsTree || [];

    // Cache all formats
    setCache(TAXONOMY_CACHE_KEY, {
      categories: window.categories,
      tags: window.tags,
      categoriesTree: window.categoriesTree,
      tagsTree: window.tagsTree
    });

    // Store initial state as "saved"
    window.lastSavedState = JSON.stringify({
      categories: window.categories,
      tags: window.tags,
      categoriesTree: window.categoriesTree,
      tagsTree: window.tagsTree
    });
    window.isDirty = false;

    renderCategories();
    renderTags();
    updateSaveButton();
  } catch (error) {
    showError('Failed to load taxonomy: ' + error.message);
  }
}

/**
 * Switches between categories and tags tabs
 *
 * Updates tab button styles, badge colors, tab content visibility, and
 * add item button visibility based on the selected tab.
 *
 * @param {string} tabName - Either 'categories' or 'tags'
 *
 * @example
 * import { switchTaxonomyTab } from './modules/taxonomy.js';
 * switchTaxonomyTab('tags');
 */
export function switchTaxonomyTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-primary', 'text-primary');
    btn.classList.add('border-transparent', 'text-secondary');
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.add('border-primary', 'text-primary');
  activeTab.classList.remove('border-transparent', 'text-secondary');

  // Update badge colors
  const categoriesBadge = document.getElementById('categories-count-badge');
  const tagsBadge = document.getElementById('tags-count-badge');

  if (tabName === 'categories') {
    categoriesBadge.classList.remove('bg-secondary', 'bg-opacity-10', 'text-secondary');
    categoriesBadge.classList.add('bg-primary', 'bg-opacity-10', 'text-primary');
    tagsBadge.classList.remove('bg-primary', 'bg-opacity-10', 'text-primary');
    tagsBadge.classList.add('bg-secondary', 'bg-opacity-10', 'text-secondary');
  } else {
    tagsBadge.classList.remove('bg-secondary', 'bg-opacity-10', 'text-secondary');
    tagsBadge.classList.add('bg-primary', 'bg-opacity-10', 'text-primary');
    categoriesBadge.classList.remove('bg-primary', 'bg-opacity-10', 'text-primary');
    categoriesBadge.classList.add('bg-secondary', 'bg-opacity-10', 'text-secondary');
  }

  // Update tab content
  document.querySelectorAll('.taxonomy-tab').forEach(content => {
    content.classList.add('d-none');
  });

  document.getElementById(`taxonomy-${tabName}-tab`).classList.remove('d-none');

  // Update add item inputs
  document.querySelectorAll('.taxonomy-add-item').forEach(input => {
    input.classList.add('d-none');
  });

  document.getElementById(`taxonomy-add-${tabName === 'categories' ? 'category' : 'tag'}`).classList.remove('d-none');
}

/**
 * Checks if a taxonomy item has been modified since last save
 *
 * Compares the current state of a category or tag at the given index
 * with the last saved state to determine if it has been modified.
 *
 * @param {string} type - Either 'category' or 'tag'
 * @param {number} index - Index of the item to check
 * @returns {boolean} True if item has been modified, false otherwise
 *
 * @private
 */
function isItemDirty(type, index) {
  if (!window.lastSavedState) return false;
  const saved = JSON.parse(window.lastSavedState);
  const current = type === 'category' ? window.categories : window.tags;
  const savedList = type === 'category' ? saved.categories : saved.tags;

  // Check if item exists in saved state and matches
  return current[index] !== savedList[index];
}

/**
 * Marks taxonomy as having unsaved changes
 *
 * Sets the isDirty flag and updates the save button state to indicate
 * that there are pending changes that need to be saved.
 *
 * @private
 */
function markDirty() {
  window.isDirty = true;
  updateSaveButton();
}

/**
 * Updates the taxonomy save button state based on unsaved changes
 *
 * Compares current taxonomy state with last saved state and enables/disables
 * the save button accordingly, updating its text and styling.
 *
 * @private
 */
function updateSaveButton() {
  const saveBtn = document.getElementById('save-btn');
  if (!saveBtn) return;

  const currentState = JSON.stringify({
    categories: window.categories,
    tags: window.tags,
    categoriesTree: window.categoriesTree,
    tagsTree: window.tagsTree
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
 * Toggles visibility of child categories
 *
 * @param {number} parentIndex - Index of parent category
 */
export function toggleCategoryChildren(parentIndex) {
  const children = document.querySelectorAll(`[data-parent-index="${parentIndex}"]`);
  const expandBtn = document.querySelector(`[data-expand-btn="${parentIndex}"]`);

  children.forEach(child => {
    child.classList.toggle('d-none');
  });

  if (expandBtn) {
    expandBtn.classList.toggle('collapsed');
  }
}

/**
 * Renders the categories list with hierarchical tree view
 *
 * Generates the HTML table rows for all categories in a tree structure with
 * expand/collapse functionality for parents. Updates the category count badge.
 * Each row includes edit and delete buttons.
 *
 * @example
 * import { renderCategories } from './modules/taxonomy.js';
 * renderCategories();
 */
export function renderCategories() {
  const tbody = document.getElementById('categories-list');
  const countBadge = document.getElementById('categories-count-badge');

  if (!tbody || !countBadge) return;

  const categoriesTree = window.categoriesTree || [];
  const categories = window.categories || [];

  // Remove loading spinner if it exists
  const loadingRow = document.getElementById('categories-loading');
  if (loadingRow) {
    loadingRow.remove();
  }

  // Generate rows with hierarchy
  let rowNumber = 1;
  const rows = [];

  categoriesTree.forEach((parent, parentIndex) => {
    const hasChildren = parent.children && parent.children.length > 0;

    // Parent row
    rows.push(`
      <tr class="small taxonomy-tree-parent" data-parent-index="${parentIndex}">
        <td class="px-3 py-2 text-muted">${rowNumber++}</td>
        <td class="px-3 py-2">
          <div class="d-flex align-items-center gap-2">
            ${hasChildren ? `
              <button
                class="taxonomy-tree-expand-btn"
                data-expand-btn="${parentIndex}"
                onclick="window.toggleCategoryChildren(${parentIndex})"
                title="Expand/collapse children"
              >
                <i class="fas fa-chevron-down"></i>
              </button>
            ` : '<span style="width: 1.75rem; display: inline-block;"></span>'}
            <i class="fas fa-bars text-secondary flex-shrink-0"></i>
            <span class="fw-medium text-dark">${escapeHtml(parent.item)}</span>
            ${hasChildren ? `<span class="badge bg-secondary ms-2">${parent.children.length}</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-2 text-end text-nowrap">
          <button
            onclick="window.editCategoryByName('${escapeHtml(parent.item).replace(/'/g, "\\'")}')"
            class="btn-icon-edit"
            title="Edit category"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            onclick="window.deleteCategoryByName('${escapeHtml(parent.item).replace(/'/g, "\\'")}')"
            class="btn-icon-delete"
            title="Delete category"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `);

    // Child rows
    if (hasChildren) {
      parent.children.forEach((child, childIndex) => {
        rows.push(`
          <tr class="small taxonomy-tree-child" data-parent-index="${parentIndex}" data-child-index="${childIndex}">
            <td class="px-3 py-2 text-muted">${rowNumber++}</td>
            <td class="px-3 py-2 taxonomy-tree-indent">
              <div class="d-flex align-items-center gap-2">
                <i class="fas fa-level-up-alt fa-rotate-90 text-secondary flex-shrink-0" style="font-size: 0.75rem;"></i>
                <span class="text-dark">${escapeHtml(child.item)}</span>
              </div>
            </td>
            <td class="px-3 py-2 text-end text-nowrap">
              <button
                onclick="window.editCategoryByName('${escapeHtml(child.item).replace(/'/g, "\\'")}')"
                class="btn-icon-edit"
                title="Edit category"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                onclick="window.deleteCategoryByName('${escapeHtml(child.item).replace(/'/g, "\\'")}')"
                class="btn-icon-delete"
                title="Delete category"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `);
      });
    }
  });

  tbody.innerHTML = rows.join('');
  countBadge.textContent = categories.length;

  // Note: Sortable.js drag-and-drop is temporarily disabled for hierarchical view
  // Will be re-enabled with hierarchy-aware sorting in next update
}

/**
 * Renders the tags list with drag-and-drop sorting
 *
 * Generates the HTML table rows for all tags, initializes Sortable.js
 * for drag-and-drop reordering, and updates the tag count badge.
 * Each row includes edit and delete buttons.
 *
 * @example
 * import { renderTags } from './modules/taxonomy.js';
 * renderTags();
 */
export function renderTags() {
  const tbody = document.getElementById('tags-list');
  const countBadge = document.getElementById('tags-count-badge');

  if (!tbody || !countBadge) return;

  const tags = window.tags || [];

  // Remove loading spinner if it exists
  const loadingRow = document.getElementById('tags-loading');
  if (loadingRow) {
    loadingRow.remove();
  }

  tbody.innerHTML = tags.map((tag, index) => {
    return `
    <tr class="small" class="cursor-move" data-index="${index}">
      <td class="px-3 py-2 text-muted">${index + 1}</td>
      <td class="px-3 py-2">
        <div class="d-flex align-items-center gap-2">
          <i class="fas fa-bars text-secondary flex-shrink-0"></i>
          <span class="fw-medium text-dark">${escapeHtml(tag)}</span>
        </div>
      </td>
      <td class="px-3 py-2 text-end text-nowrap">
        <button
          onclick="window.editTag(${index})"
          class="btn-icon-edit"
          title="Edit tag"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button
          onclick="window.deleteTag(${index})"
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

  // Destroy previous Sortable instance if it exists
  if (window.sortableInstances && window.sortableInstances.tags) {
    window.sortableInstances.tags.destroy();
  }

  // Initialize sortable
  if (typeof Sortable !== 'undefined') {
    if (!window.sortableInstances) {
      window.sortableInstances = { categories: null, tags: null };
    }

    window.sortableInstances.tags = new Sortable(tbody, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: 'tr',
      onEnd: (evt) => {
        const item = window.tags.splice(evt.oldIndex, 1)[0];
        window.tags.splice(evt.newIndex, 0, item);
        markDirty();
        // Don't call renderTags() here - causes excessive re-rendering
        // Sortable already updated the DOM visually
      }
    });
  }
}

/**
 * Finds a category by name and calls edit with the correct index
 *
 * @param {string} categoryName - Name of the category to edit
 */
export async function editCategoryByName(categoryName) {
  const categories = window.categories || [];
  const index = categories.findIndex(cat => cat === categoryName);

  if (index !== -1) {
    await editCategory(index);
  } else {
    showError('Category not found');
  }
}

/**
 * Finds a category by name and calls delete with the correct index
 *
 * @param {string} categoryName - Name of the category to delete
 */
export async function deleteCategoryByName(categoryName) {
  const categories = window.categories || [];
  const index = categories.findIndex(cat => cat === categoryName);

  if (index !== -1) {
    await deleteCategory(index);
  } else {
    showError('Category not found');
  }
}

/**
 * Shows modal to add a new category
 *
 * Displays a modal dialog for entering a new category name, validates the input
 * (checks for empty names and duplicates), adds the category to the list,
 * and automatically saves changes to the backend.
 *
 * @throws {Error} If category addition fails
 *
 * @example
 * import { showAddCategoryModal} from './modules/taxonomy.js';
 * await showAddCategoryModal();
 */
export async function showAddCategoryModal() {
  try {
    const newValue = await window.showModal('Add Category', '');
    if (newValue === null) return;

    const trimmed = newValue.trim();
    if (!trimmed) {
      showError('Category name cannot be empty');
      return;
    }

    if (window.categories.includes(trimmed)) {
      showError('Category already exists');
      return;
    }

    window.categories.push(trimmed);
    renderCategories();
    hideMessages();

    // Auto-save after adding
    await saveTaxonomy();
  } catch (error) {
    console.error('Error adding category:', error);
    showError('Failed to add category: ' + error.message);
  }
}

/**
 * Shows modal to edit an existing category
 *
 * Displays a modal dialog pre-filled with the current category name, validates
 * the edited input (checks for empty names and duplicates), updates the category,
 * and automatically saves changes to the backend.
 *
 * @param {number} index - Index of the category to edit
 *
 * @throws {Error} If category update fails
 *
 * @example
 * import { editCategory } from './modules/taxonomy.js';
 * await editCategory(0);
 */
export async function editCategory(index) {
  const newValue = await window.showModal('Edit Category', window.categories[index]);
  if (newValue === null) return;

  const trimmed = newValue.trim();
  if (!trimmed) {
    showError('Category name cannot be empty');
    return;
  }

  if (window.categories.includes(trimmed) && trimmed !== window.categories[index]) {
    showError('Category already exists');
    return;
  }

  window.categories[index] = trimmed;
  renderCategories();
  hideMessages();

  // Auto-save after editing
  await saveTaxonomy();
}

/**
 * Deletes a category after user confirmation
 *
 * Shows a confirmation dialog, removes the category from the list if confirmed,
 * and automatically saves changes to the backend.
 *
 * @param {number} index - Index of the category to delete
 *
 * @throws {Error} If category deletion fails
 *
 * @example
 * import { deleteCategory } from './modules/taxonomy.js';
 * await deleteCategory(0);
 */
export async function deleteCategory(index) {
  const confirmed = await window.showConfirm(`Are you sure you want to delete "${window.categories[index]}"?`);
  if (!confirmed) return;

  window.categories.splice(index, 1);
  renderCategories();
  hideMessages();

  // Auto-save after deleting
  await saveTaxonomy();
}

/**
 * Shows modal to add a new tag
 *
 * Displays a modal dialog for entering a new tag name, validates the input
 * (checks for empty names and duplicates), adds the tag to the list,
 * and automatically saves changes to the backend.
 *
 * @throws {Error} If tag addition fails
 *
 * @example
 * import { showAddTagModal } from './modules/taxonomy.js';
 * await showAddTagModal();
 */
export async function showAddTagModal() {
  try {
    const newValue = await window.showModal('Add Tag', '');
    if (newValue === null) return;

    const trimmed = newValue.trim();
    if (!trimmed) {
      showError('Tag name cannot be empty');
      return;
    }

    if (window.tags.includes(trimmed)) {
      showError('Tag already exists');
      return;
    }

    window.tags.push(trimmed);
    renderTags();
    hideMessages();

    // Auto-save after adding
    await saveTaxonomy();
  } catch (error) {
    console.error('Error adding tag:', error);
    showError('Failed to add tag: ' + error.message);
  }
}

/**
 * Shows modal to edit an existing tag
 *
 * Displays a modal dialog pre-filled with the current tag name, validates
 * the edited input (checks for empty names and duplicates), updates the tag,
 * and automatically saves changes to the backend.
 *
 * @param {number} index - Index of the tag to edit
 *
 * @throws {Error} If tag update fails
 *
 * @example
 * import { editTag } from './modules/taxonomy.js';
 * await editTag(0);
 */
export async function editTag(index) {
  const newValue = await window.showModal('Edit Tag', window.tags[index]);
  if (newValue === null) return;

  const trimmed = newValue.trim();
  if (!trimmed) {
    showError('Tag name cannot be empty');
    return;
  }

  if (window.tags.includes(trimmed) && trimmed !== window.tags[index]) {
    showError('Tag already exists');
    return;
  }

  window.tags[index] = trimmed;
  renderTags();
  hideMessages();

  // Auto-save after editing
  await saveTaxonomy();
}

/**
 * Deletes a tag after user confirmation
 *
 * Shows a confirmation dialog, removes the tag from the list if confirmed,
 * and automatically saves changes to the backend.
 *
 * @param {number} index - Index of the tag to delete
 *
 * @throws {Error} If tag deletion fails
 *
 * @example
 * import { deleteTag } from './modules/taxonomy.js';
 * await deleteTag(0);
 */
export async function deleteTag(index) {
  const confirmed = await window.showConfirm(`Are you sure you want to delete "${window.tags[index]}"?`);
  if (!confirmed) return;

  window.tags.splice(index, 1);
  renderTags();
  hideMessages();

  // Auto-save after deleting
  await saveTaxonomy();
}

/**
 * Saves taxonomy changes to the backend
 *
 * Sends a PUT request with current categories and tags to the API, handles
 * deployment tracking if changes result in a Git commit, and updates the UI state.
 *
 * @throws {Error} If save operation fails
 *
 * @example
 * import { saveTaxonomy } from './modules/taxonomy.js';
 * await saveTaxonomy();
 */
export async function saveTaxonomy() {
  const saveBtn = document.getElementById('save-btn');
  setButtonLoading(saveBtn, true, 'Saving...');

  try {
    const response = await fetch(`${window.API_BASE}/taxonomy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Send both flat (backwards compat) and hierarchical data
        categories: window.categories,
        tags: window.tags,
        categoriesTree: window.categoriesTree,
        tagsTree: window.tagsTree
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save');
    }

    const data = await response.json();

    if (data.commitSha && window.trackDeployment) {
      window.trackDeployment(data.commitSha, 'Update taxonomy', 'taxonomy.yml');
    }

    // Update cache with all data formats
    setCache(TAXONOMY_CACHE_KEY, {
      categories: window.categories,
      tags: window.tags,
      categoriesTree: window.categoriesTree,
      tagsTree: window.tagsTree
    });

    // Update saved state
    window.lastSavedState = JSON.stringify({
      categories: window.categories,
      tags: window.tags,
      categoriesTree: window.categoriesTree,
      tagsTree: window.tagsTree
    });
    window.isDirty = false;

    showSuccess('Taxonomy saved successfully!');
    renderCategories();
    renderTags();
    updateSaveButton();
  } catch (error) {
    showError('Failed to save taxonomy: ' + error.message);
  } finally {
    setButtonLoading(saveBtn, false);
  }
}
