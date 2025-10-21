/**
 * Settings Module
 *
 * Manages site configuration settings from _config.yml with form handling and deployment tracking.
 * Provides settings load and save functionality for the admin interface.
 *
 * Features:
 * - Load site settings from backend
 * - Populate form fields with current settings
 * - Save settings with type conversion (integers for paginate and related_posts_count)
 * - Track deployments when settings are saved
 * - Handle form submission with loading states
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

    showSuccess(result.message || 'Settings saved successfully!');
  } catch (error) {
    showError('Failed to save settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Settings';
  }
}
