/**
 * UI Notifications Module
 *
 * Handles user-facing success and error messages with automatic dismissal.
 * Displays messages in predefined DOM containers and auto-hides after 5 seconds.
 *
 * @module ui/notifications
 */

import { escapeHtml } from '../core/utils.js';

/**
 * Cached references to notification DOM elements
 * Initialized by initNotifications()
 * @private
 */
let errorElement = null;
let successElement = null;

/**
 * Initializes notification system by caching DOM references
 *
 * Must be called after DOM is loaded and before using notification functions.
 * Caches references to error and success message containers.
 *
 * @example
 * import { initNotifications } from './ui/notifications.js';
 * document.addEventListener('DOMContentLoaded', () => {
 *   initNotifications();
 * });
 */
export function initNotifications() {
  errorElement = document.getElementById('error');
  successElement = document.getElementById('success');

  if (!errorElement || !successElement) {
    console.warn('Notification elements not found in DOM');
  }
}

/**
 * Displays an error message to the user
 *
 * Shows the error message in a red notification banner that auto-dismisses after 5 seconds.
 * Message is automatically escaped to prevent XSS attacks.
 *
 * @param {string} message - Error message to display
 *
 * @example
 * import { showError } from './ui/notifications.js';
 * showError('Failed to save post');
 */
export function showError(message) {
  if (!errorElement) {
    console.error('Error element not initialized:', message);
    return;
  }

  const messageEl = errorElement.querySelector('p');
  if (messageEl) {
    messageEl.textContent = message;
  } else {
    errorElement.innerHTML = `<p class="text-red-800">${escapeHtml(message)}</p>`;
  }

  errorElement.classList.remove('hidden');
  setTimeout(() => errorElement.classList.add('hidden'), 5000);
}

/**
 * Displays a success message to the user
 *
 * Shows the success message in a green notification banner that auto-dismisses after 5 seconds.
 * Message is automatically escaped to prevent XSS attacks.
 *
 * @param {string} [message='Operation successful!'] - Success message to display
 *
 * @example
 * import { showSuccess } from './ui/notifications.js';
 * showSuccess('Post saved successfully!');
 */
export function showSuccess(message = 'Operation successful!') {
  if (!successElement) {
    console.error('Success element not initialized:', message);
    return;
  }

  const messageEl = successElement.querySelector('p');
  if (messageEl) {
    messageEl.textContent = message;
  } else {
    successElement.innerHTML = `<p class="text-green-800">${escapeHtml(message)}</p>`;
  }

  successElement.classList.remove('hidden');
  setTimeout(() => successElement.classList.add('hidden'), 5000);
}

/**
 * Hides all notification messages
 *
 * Immediately hides both error and success notification banners.
 * Useful when navigating between sections or before displaying new messages.
 *
 * @example
 * import { hideMessages } from './ui/notifications.js';
 * hideMessages();
 */
export function hideMessages() {
  if (errorElement) {
    errorElement.classList.add('hidden');
  }
  if (successElement) {
    successElement.classList.add('hidden');
  }
}
