/**
 * Unit Tests for Appearance Module
 *
 * Tests the Google Fonts management functionality at a high level,
 * focusing on the public API: initAppearance() and saveFonts()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initAppearance, saveFonts } from '../../../admin/js/modules/appearance.js';

describe('Appearance Module', () => {
  let fetchMock;
  let notificationMocks;
  let loggerMocks;

  beforeEach(async () => {
    // Create DOM elements required by the module
    document.body.innerHTML = `
      <input type="checkbox" id="google-fonts-enabled" />
      <div id="font-settings" style="display: none;">
        <select id="body-font"></select>
        <select id="heading-font"></select>
        <div id="body-font-preview"></div>
        <div id="heading-font-preview"></div>
      </div>
    `;

    // Mock netlifyIdentity
    global.window.netlifyIdentity = {
      currentUser: () => ({
        token: {
          access_token: 'test-token-123'
        }
      })
    };

    // Mock window.trackDeployment
    global.window.trackDeployment = vi.fn();

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock notifications module
    const notificationsModule = await import('../../../admin/js/ui/notifications.js');
    notificationMocks = {
      showError: vi.spyOn(notificationsModule, 'showError').mockImplementation(() => {}),
      showSuccess: vi.spyOn(notificationsModule, 'showSuccess').mockImplementation(() => {})
    };

    // Mock logger module
    const loggerModule = await import('../../../admin/js/core/logger.js');
    loggerMocks = {
      error: vi.spyOn(loggerModule.default, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.window.netlifyIdentity;
    delete global.window.trackDeployment;
    document.body.innerHTML = '';
  });

  describe('initAppearance', () => {
    it('initializes successfully with minimal settings', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await initAppearance();

      expect(fetchMock).toHaveBeenCalledWith(
        '/.netlify/functions/settings',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-token-123' }
        })
      );
    });

    it('applies enabled state from API response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google_fonts: {
            enabled: true,
            body_font: 'Open Sans',
            heading_font: 'Montserrat'
          }
        })
      });

      await initAppearance();

      const enabledCheckbox = document.getElementById('google-fonts-enabled');
      expect(enabledCheckbox.checked).toBe(true);

      const fontSettings = document.getElementById('font-settings');
      expect(fontSettings.style.display).toBe('block');
    });

    it('applies disabled state from API response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google_fonts: {
            enabled: false
          }
        })
      });

      await initAppearance();

      const enabledCheckbox = document.getElementById('google-fonts-enabled');
      expect(enabledCheckbox.checked).toBe(false);

      const fontSettings = document.getElementById('font-settings');
      expect(fontSettings.style.display).toBe('none');
    });

    it('handles API errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await initAppearance();

      expect(loggerMocks.error).toHaveBeenCalled();
      expect(notificationMocks.showError).toHaveBeenCalledWith('Failed to load font settings');
    });

    it('handles network errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await initAppearance();

      expect(loggerMocks.error).toHaveBeenCalled();
      expect(notificationMocks.showError).toHaveBeenCalledWith('Failed to load font settings');
    });

    it('makes API call with correct authorization header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await initAppearance();

      expect(fetchMock).toHaveBeenCalledWith(
        '/.netlify/functions/settings',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });
  });

  describe('saveFonts', () => {
    beforeEach(async () => {
      // Initialize first with a successful response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await initAppearance();
      fetchMock.mockClear(); // Clear the init call
    });

    it('saves font settings via API', async () => {
      const enabledCheckbox = document.getElementById('google-fonts-enabled');
      enabledCheckbox.checked = true;

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ commitSha: 'abc123' })
      });

      await saveFonts();

      expect(fetchMock).toHaveBeenCalledWith(
        '/.netlify/functions/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('sends correct data structure', async () => {
      const enabledCheckbox = document.getElementById('google-fonts-enabled');
      enabledCheckbox.checked = false;

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await saveFonts();

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody).toHaveProperty('google_fonts');
      expect(callBody.google_fonts).toHaveProperty('enabled');
      expect(callBody.google_fonts).toHaveProperty('body_font');
      expect(callBody.google_fonts).toHaveProperty('heading_font');
    });

    it('shows success message after saving', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ commitSha: 'abc123' })
      });

      await saveFonts();

      expect(notificationMocks.showSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Font settings saved successfully')
      );
    });

    it('tracks deployment when commitSha is returned', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ commitSha: 'abc123' })
      });

      await saveFonts();

      expect(window.trackDeployment).toHaveBeenCalledWith({
        commitSha: 'abc123',
        action: 'Update Google Fonts settings',
        type: 'settings'
      });
    });

    it('does not track deployment when commitSha is missing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await saveFonts();

      expect(window.trackDeployment).not.toHaveBeenCalled();
    });

    it('handles save errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await saveFonts();

      expect(loggerMocks.error).toHaveBeenCalled();
      expect(notificationMocks.showError).toHaveBeenCalledWith('Failed to save font settings');
    });

    it('handles network errors during save', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await saveFonts();

      expect(loggerMocks.error).toHaveBeenCalled();
      expect(notificationMocks.showError).toHaveBeenCalledWith('Failed to save font settings');
    });

    it('includes auth token in save request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await saveFonts();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });
  });

  describe('Integration', () => {
    it('completes init and save cycle successfully', async () => {
      // Init
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google_fonts: { enabled: false }
        })
      });

      await initAppearance();

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Save
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await saveFonts();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(notificationMocks.showSuccess).toHaveBeenCalled();
    });
  });
});
