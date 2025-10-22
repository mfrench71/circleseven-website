/**
 * Settings Module
 *
 * Manages both site configuration and admin application settings.
 *
 * Features:
 * - Load/save site settings from _config.yml via backend API
 * - Load/save admin application settings from localStorage
 * - Populate form fields with current settings
 * - Track deployments when site settings are saved
 * - Reset admin settings to defaults
 *
 * Admin Settings (stored in localStorage):
 * - Deployment status poll interval
 * - Deployment history poll interval
 * - Deployment timeout
 * - Fetch timeout
 * - Debounce delay
 *
 * Dependencies:
 * - ui/notifications.js for showError() and showSuccess()
 * - Global API_BASE constant
 * - Global trackDeployment() function
 *
 * @module modules/settings
 */

import { showError, showSuccess } from '../ui/notifications.js';

/**
 * Default admin application settings
 * @constant {Object}
 */
const DEFAULT_ADMIN_SETTINGS = {
  deployment_poll_interval: 10000,      // 10 seconds
  deployment_history_poll_interval: 30000, // 30 seconds
  deployment_timeout: 600,              // 10 minutes (in seconds)
  fetch_timeout: 30000,                 // 30 seconds
  debounce_delay: 300                   // 300 milliseconds
};

/**
 * Loads admin settings from localStorage or returns defaults
 *
 * @returns {Object} Admin settings object
 */
function getAdminSettings() {
  try {
    const stored = localStorage.getItem('admin_settings');
    if (stored) {
      return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load admin settings from localStorage:', error);
  }
  return { ...DEFAULT_ADMIN_SETTINGS };
}

/**
 * Loads site settings from the backend and populates form fields
 *
 * Fetches settings from the /settings API endpoint and populates all form inputs
 * with matching IDs (format: `setting-{key}`).
 *
 * @throws {Error} If settings load fails
 *
 * @example
 * import { loadSettings } from './modules/settings.js';
 * await loadSettings();
 */
export async function loadSettings() {
  try {
    const response = await fetch(`${window.API_BASE}/settings`);
    if (!response.ok) throw new Error('Failed to load settings');

    const settings = await response.json();

    // Populate form fields
    Object.keys(settings).forEach(key => {
      const input = document.getElementById(`setting-${key}`);
      if (input) {
        input.value = settings[key] || '';
      }
    });

    // Update admin title with site title
    if (settings.title) {
      const adminTitle = document.getElementById('admin-title');
      if (adminTitle) {
        adminTitle.textContent = `${settings.title} Admin`;
      }
    }
  } catch (error) {
    showError('Failed to load settings: ' + error.message);
  }
}

/**
 * Saves site settings to the backend with deployment tracking
 *
 * Collects form data, converts number fields appropriately (paginate, related_posts_count),
 * sends a PUT request to the API, and tracks the deployment if successful.
 * Updates button states during the save operation.
 *
 * @param {Event} event - Form submit event
 *
 * @throws {Error} If settings save fails
 *
 * @example
 * import { saveSettings } from './modules/settings.js';
 *
 * // Attach to form submit
 * document.getElementById('settings-form').addEventListener('submit', saveSettings);
 */
export async function saveSettings(event) {
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

    const response = await fetch(`${window.API_BASE}/settings`, {
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
    if (result.commitSha && window.trackDeployment) {
      window.trackDeployment(result.commitSha, 'Update site settings', '_config.yml');
    }

    // Update admin title if site title changed
    const newTitle = settings.title;
    if (newTitle) {
      const adminTitle = document.getElementById('admin-title');
      if (adminTitle) {
        adminTitle.textContent = `${newTitle} Admin`;
      }
    }

    showSuccess(result.message || 'Settings saved successfully!');
  } catch (error) {
    showError('Failed to save settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Settings';
  }
}

/**
 * Loads admin application settings and populates the form
 *
 * Retrieves settings from localStorage and populates form inputs with current values.
 * Falls back to defaults if no stored settings exist.
 *
 * @example
 * import { loadAdminSettings } from './modules/settings.js';
 * await loadAdminSettings();
 */
export function loadAdminSettings() {
  const settings = getAdminSettings();

  // Populate form fields
  Object.keys(settings).forEach(key => {
    const input = document.getElementById(`admin-setting-${key.replace(/_/g, '-')}`);
    if (input) {
      input.value = settings[key] || '';
    }
  });
}

/**
 * Saves admin application settings to localStorage
 *
 * Collects form data, validates values, stores in localStorage, and updates global constants.
 * Shows success/error notifications.
 *
 * @param {Event} event - Form submit event
 *
 * @example
 * import { saveAdminSettings } from './modules/settings.js';
 *
 * // Attach to form submit
 * document.getElementById('admin-settings-form').addEventListener('submit', saveAdminSettings);
 */
export function saveAdminSettings(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('admin-settings-save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const form = document.getElementById('admin-settings-form');
    const formData = new FormData(form);
    const settings = {};

    // Collect and parse form values
    formData.forEach((value, key) => {
      settings[key] = parseInt(value, 10);
    });

    // Save to localStorage
    localStorage.setItem('admin_settings', JSON.stringify(settings));

    // Update global constants that are already in use
    if (window.DEPLOYMENT_STATUS_POLL_INTERVAL !== undefined) {
      window.DEPLOYMENT_STATUS_POLL_INTERVAL = settings.deployment_poll_interval;
    }
    if (window.DEPLOYMENT_HISTORY_POLL_INTERVAL !== undefined) {
      window.DEPLOYMENT_HISTORY_POLL_INTERVAL = settings.deployment_history_poll_interval;
    }
    if (window.DEPLOYMENT_TIMEOUT !== undefined) {
      window.DEPLOYMENT_TIMEOUT = settings.deployment_timeout;
    }

    showSuccess('Admin settings saved! Some changes may require a page refresh to take full effect.');
  } catch (error) {
    showError('Failed to save admin settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Admin Settings';
  }
}

/**
 * Resets admin application settings to default values
 *
 * Reloads the form with default values and notifies the user. Does not save automatically -
 * user must click "Save" to persist the defaults.
 *
 * @example
 * import { resetAdminSettings } from './modules/settings.js';
 *
 * // Attach to reset button
 * document.getElementById('reset-admin-settings').addEventListener('click', resetAdminSettings);
 */
export function resetAdminSettings() {
  // Populate form with defaults
  Object.keys(DEFAULT_ADMIN_SETTINGS).forEach(key => {
    const input = document.getElementById(`admin-setting-${key.replace(/_/g, '-')}`);
    if (input) {
      input.value = DEFAULT_ADMIN_SETTINGS[key];
    }
  });

  showSuccess('Admin settings reset to defaults. Click "Save" to apply.');
}
