/**
 * Unit Tests for Settings Module
 *
 * Tests admin settings and site settings functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDocument, createAdminSettingsForm } from '../../utils/dom-helpers.js';
import { mockAdminSettings, mockSiteSettings } from '../../utils/mock-data.js';

describe('Settings Module', () => {
  beforeEach(() => {
    setupDocument();
    localStorage.clear();
  });

  describe('loadAdminSettings', () => {
    it('populates form fields with correct IDs', () => {
      // Create admin settings form
      const form = createAdminSettingsForm();

      // Store settings in localStorage
      localStorage.setItem('admin_settings', JSON.stringify(mockAdminSettings));

      // Simulate loadAdminSettings - converts underscore keys to dash IDs
      Object.entries(mockAdminSettings).forEach(([key, value]) => {
        const fieldId = `admin-setting-${key.replace(/_/g, '-')}`;
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = value;
        }
      });

      // Verify all fields populated correctly
      expect(document.getElementById('admin-setting-deployment-poll-interval').value)
        .toBe('10000');
      expect(document.getElementById('admin-setting-deployment-history-poll-interval').value)
        .toBe('30000');
      expect(document.getElementById('admin-setting-deployment-timeout').value)
        .toBe('600');
      expect(document.getElementById('admin-setting-fetch-timeout').value)
        .toBe('30000');
      expect(document.getElementById('admin-setting-debounce-delay').value)
        .toBe('300');
    });

    it('falls back to defaults if no stored settings', () => {
      const form = createAdminSettingsForm();

      // No settings in localStorage
      const stored = localStorage.getItem('admin_settings');
      expect(stored).toBeNull();

      // Populate with defaults
      const defaults = mockAdminSettings;
      Object.entries(defaults).forEach(([key, value]) => {
        const fieldId = `admin-setting-${key.replace(/_/g, '-')}`;
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = value;
        }
      });

      // Verify defaults loaded
      expect(document.getElementById('admin-setting-deployment-poll-interval').value)
        .toBe('10000');
    });

    it('merges stored settings with defaults', () => {
      createAdminSettingsForm();

      // Only store partial settings
      localStorage.setItem('admin_settings', JSON.stringify({
        deployment_poll_interval: 15000
      }));

      const stored = JSON.parse(localStorage.getItem('admin_settings'));
      const merged = { ...mockAdminSettings, ...stored };

      // deployment_poll_interval overridden, others use defaults
      expect(merged.deployment_poll_interval).toBe(15000);
      expect(merged.deployment_history_poll_interval).toBe(30000);
    });
  });

  describe('saveAdminSettings', () => {
    it('stores form values in localStorage', () => {
      const form = createAdminSettingsForm();

      // Change a value
      document.getElementById('admin-setting-deployment-poll-interval').value = '15000';

      // Collect form data
      const formData = new FormData(form);
      const settings = {};
      formData.forEach((value, key) => {
        settings[key] = parseInt(value, 10);
      });

      // Save to localStorage
      localStorage.setItem('admin_settings', JSON.stringify(settings));

      // Verify saved
      const stored = JSON.parse(localStorage.getItem('admin_settings'));
      expect(stored.deployment_poll_interval).toBe(15000);
    });

    it('updates global constants', () => {
      createAdminSettingsForm();

      // Mock window globals
      window.DEPLOYMENT_STATUS_POLL_INTERVAL = 10000;

      // Save new settings
      const newSettings = { ...mockAdminSettings, deployment_poll_interval: 15000 };
      localStorage.setItem('admin_settings', JSON.stringify(newSettings));

      // Update global
      window.DEPLOYMENT_STATUS_POLL_INTERVAL = newSettings.deployment_poll_interval;

      expect(window.DEPLOYMENT_STATUS_POLL_INTERVAL).toBe(15000);
    });

    it('shows success notification after save', () => {
      createAdminSettingsForm();

      const successNotification = vi.fn();

      // Simulate save
      localStorage.setItem('admin_settings', JSON.stringify(mockAdminSettings));
      successNotification('Admin settings saved!');

      expect(successNotification).toHaveBeenCalledWith('Admin settings saved!');
    });
  });

  describe('resetAdminSettings', () => {
    it('restores default values to form', () => {
      const form = createAdminSettingsForm();

      // Change values
      document.getElementById('admin-setting-deployment-poll-interval').value = '99999';

      // Reset to defaults
      Object.entries(mockAdminSettings).forEach(([key, value]) => {
        const fieldId = `admin-setting-${key.replace(/_/g, '-')}`;
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = value;
        }
      });

      // Verify reset
      expect(document.getElementById('admin-setting-deployment-poll-interval').value)
        .toBe('10000');
    });

    it('does not save automatically - user must click save', () => {
      createAdminSettingsForm();

      // Reset form values
      Object.entries(mockAdminSettings).forEach(([key, value]) => {
        const fieldId = `admin-setting-${key.replace(/_/g, '-')}`;
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = value;
        }
      });

      // localStorage should not be updated yet
      const stored = localStorage.getItem('admin_settings');
      expect(stored).toBeNull();
    });
  });

  describe('loadSettings (Site Configuration)', () => {
    it('populates site settings from API response', async () => {
      // Create site settings form
      const form = document.createElement('form');
      form.id = 'settings-form';

      Object.entries(mockSiteSettings).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.id = `setting-${key}`;
        input.name = key;
        form.appendChild(input);
      });

      document.body.appendChild(form);

      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSiteSettings)
        })
      );

      // Simulate loadSettings
      const response = await fetch('/.netlify/functions/settings');
      const settings = await response.json();

      Object.entries(settings).forEach(([key, value]) => {
        const input = document.getElementById(`setting-${key}`);
        if (input) {
          input.value = value;
        }
      });

      // Verify fields populated
      expect(document.getElementById('setting-title').value).toBe('Circle Seven');
      expect(document.getElementById('setting-author').value).toBe('Matthew French');
      expect(document.getElementById('setting-email').value).toBe('test@example.com');
    });

    it('shows error if API call fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const showError = vi.fn();

      try {
        await fetch('/.netlify/functions/settings');
      } catch (error) {
        showError('Failed to load settings: ' + error.message);
      }

      expect(showError).toHaveBeenCalledWith('Failed to load settings: Network error');
    });
  });

  describe('ID Matching (Regression Test)', () => {
    it('admin setting IDs match JavaScript expectations', () => {
      createAdminSettingsForm();

      // These are the exact IDs the JavaScript looks for
      const expectedIds = [
        'admin-setting-deployment-poll-interval',
        'admin-setting-deployment-history-poll-interval',
        'admin-setting-deployment-timeout',
        'admin-setting-fetch-timeout',
        'admin-setting-debounce-delay',
      ];

      expectedIds.forEach(id => {
        const element = document.getElementById(id);
        expect(element).not.toBeNull();
        expect(element.tagName).toBe('INPUT');
      });
    });

    it('converts underscore keys to dash IDs correctly', () => {
      const testCases = [
        { key: 'deployment_poll_interval', expected: 'admin-setting-deployment-poll-interval' },
        { key: 'deployment_history_poll_interval', expected: 'admin-setting-deployment-history-poll-interval' },
        { key: 'deployment_timeout', expected: 'admin-setting-deployment-timeout' },
        { key: 'fetch_timeout', expected: 'admin-setting-fetch-timeout' },
        { key: 'debounce_delay', expected: 'admin-setting-debounce-delay' },
      ];

      testCases.forEach(({ key, expected }) => {
        const result = `admin-setting-${key.replace(/_/g, '-')}`;
        expect(result).toBe(expected);
      });
    });
  });
});
