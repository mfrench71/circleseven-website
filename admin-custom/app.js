// State
let categories = [];
let tags = [];
let user = null;

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
  loadTaxonomy();
}

// Load taxonomy from API
async function loadTaxonomy() {
  try {
    const response = await fetch(`${API_BASE}/taxonomy`);
    if (!response.ok) throw new Error('Failed to load taxonomy');

    const data = await response.json();
    categories = data.categories || [];
    tags = data.tags || [];

    renderCategories();
    renderTags();

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('taxonomy-editor').classList.remove('hidden');
  } catch (error) {
    showError('Failed to load taxonomy: ' + error.message);
    document.getElementById('loading').classList.add('hidden');
  }
}

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active', 'border-teal-600', 'text-teal-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.add('active', 'border-teal-600', 'text-teal-600');
  activeTab.classList.remove('border-transparent', 'text-gray-500');

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  document.getElementById(`panel-${tabName}`).classList.remove('hidden');
}

// Render categories
function renderCategories() {
  const list = document.getElementById('categories-list');
  const countBadge = document.getElementById('categories-count-badge');

  list.innerHTML = categories.map((cat, index) => `
    <li class="flex items-center gap-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition cursor-move" data-index="${index}">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <span class="flex-1 font-medium">${escapeHtml(cat)}</span>
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
  `).join('');

  countBadge.textContent = categories.length;

  // Initialize sortable
  new Sortable(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const item = categories.splice(evt.oldIndex, 1)[0];
      categories.splice(evt.newIndex, 0, item);
    }
  });
}

// Render tags
function renderTags() {
  const list = document.getElementById('tags-list');
  const countBadge = document.getElementById('tags-count-badge');

  list.innerHTML = tags.map((tag, index) => `
    <li class="flex items-center gap-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition cursor-move" data-index="${index}">
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <span class="flex-1 font-medium">${escapeHtml(tag)}</span>
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
  `).join('');

  countBadge.textContent = tags.length;

  // Initialize sortable
  new Sortable(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const item = tags.splice(evt.oldIndex, 1)[0];
      tags.splice(evt.newIndex, 0, item);
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
  renderCategories();
  hideMessages();
}

// Delete category
async function deleteCategory(index) {
  const confirmed = await showConfirm(`Are you sure you want to delete "${categories[index]}"?`);
  if (!confirmed) return;
  categories.splice(index, 1);
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
  renderTags();
  hideMessages();
}

// Delete tag
async function deleteTag(index) {
  const confirmed = await showConfirm(`Are you sure you want to delete "${tags[index]}"?`);
  if (!confirmed) return;
  tags.splice(index, 1);
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

    showSuccess();
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
