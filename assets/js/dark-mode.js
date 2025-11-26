/**
 * Dark Mode Toggle
 * Manages theme switching with localStorage persistence
 * Supports manual toggle and system preference fallback
 */

(function() {
  const STORAGE_KEY = 'theme-preference';
  const THEME_ATTR = 'data-theme';

  /**
   * Get current theme preference
   * Priority: localStorage > system preference > light (default)
   * @returns {string} 'light' or 'dark'
   */
  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }

    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Apply theme to document
   * @param {string} theme - 'light' or 'dark'
   */
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute(THEME_ATTR, 'dark');
    } else {
      document.documentElement.removeAttribute(THEME_ATTR);
    }

    // Update toggle button if it exists
    updateToggleButton(theme);
  }

  /**
   * Update toggle button state
   * @param {string} theme - 'light' or 'dark'
   */
  function updateToggleButton(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle');
    if (toggleBtns.length === 0) return;

    toggleBtns.forEach(toggleBtn => {
      const icon = toggleBtn.querySelector('.theme-icon');
      if (!icon) return;

      if (theme === 'dark') {
        // Show sun icon (switch to light)
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        toggleBtn.setAttribute('aria-label', 'Switch to light mode');
        toggleBtn.setAttribute('aria-pressed', 'true');
      } else {
        // Show moon icon (switch to dark)
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        toggleBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Toggle theme between light and dark
   */
  function toggleTheme() {
    const current = getThemePreference();
    const newTheme = current === 'dark' ? 'light' : 'dark';

    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);

    // Dispatch custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
  }

  /**
   * Initialize dark mode on page load
   * IMPORTANT: This runs immediately to prevent flash
   */
  function init() {
    const theme = getThemePreference();
    applyTheme(theme);

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-update if user hasn't set a manual preference
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // Set up toggle button when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupToggleButton);
    } else {
      setupToggleButton();
    }
  }

  /**
   * Set up toggle button click handler
   */
  function setupToggleButton() {
    const toggleBtns = document.querySelectorAll('.theme-toggle');
    if (toggleBtns.length > 0) {
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', toggleTheme);
      });

      // Update initial state
      const theme = getThemePreference();
      updateToggleButton(theme);
    }
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getThemePreference,
      applyTheme,
      toggleTheme,
      STORAGE_KEY
    };
  }

  // Initialize immediately
  init();
})();
