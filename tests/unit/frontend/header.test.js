/**
 * Unit Tests for Header Component
 *
 * Tests the shared header component that renders the admin header
 * with deployment banner and navigation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHeader, initHeader } from '../../../admin/js/components/header.js';

describe('Header Component', () => {
  describe('renderHeader', () => {
    let html;

    beforeEach(() => {
      html = renderHeader();
    });

    it('returns a non-empty string', () => {
      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('contains the main header element', () => {
      expect(html).toContain('<header id="main-header"');
      expect(html).toContain('</header>');
    });

    it('includes correct header styling classes', () => {
      expect(html).toContain('bg-white');
      expect(html).toContain('border-bottom');
      expect(html).toContain('position-fixed');
      expect(html).toContain('top-0');
      expect(html).toContain('start-0');
      expect(html).toContain('end-0');
    });

    it('sets correct z-index for header layering', () => {
      expect(html).toContain('z-index: 1030');
    });

    it('includes deployment status section (hidden by default)', () => {
      expect(html).toContain('id="deployment-status-header"');
      expect(html).toContain('class="d-none');
    });

    it('includes deployment status message elements', () => {
      expect(html).toContain('id="deployment-status-message"');
      expect(html).toContain('Publishing changes...');
      expect(html).toContain('id="deployment-status-time"');
      expect(html).toContain('0:00');
    });

    it('includes spinner icon for deployment status', () => {
      expect(html).toContain('fa-spinner');
      expect(html).toContain('fa-spin');
    });

    it('includes site link with correct attributes', () => {
      expect(html).toContain('href="/"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener"');
    });

    it('uses default site title when siteConfig is not available', () => {
      // Ensure no siteConfig exists
      delete window.siteConfig;
      const htmlWithoutConfig = renderHeader();
      expect(htmlWithoutConfig).toContain('Site name');
    });

    it('uses site title from window.siteConfig when available', () => {
      // Set up siteConfig
      window.siteConfig = { title: 'Test Site' };
      const htmlWithConfig = renderHeader();
      expect(htmlWithConfig).toContain('Test Site');

      // Clean up
      delete window.siteConfig;
    });

    it('includes external link icon for site link', () => {
      expect(html).toContain('fa-external-link-alt');
    });

    it('includes logout button with safe onclick handler', () => {
      expect(html).toContain('if (window.netlifyIdentity) netlifyIdentity.logout()');
      expect(html).toContain('Log Out');
    });

    it('includes logout icon', () => {
      expect(html).toContain('fa-sign-out-alt');
    });

    it('uses flexbox layout for header content', () => {
      expect(html).toContain('d-flex');
      expect(html).toContain('justify-content-between');
      expect(html).toContain('align-items-center');
    });

    it('includes gap spacing for elements', () => {
      expect(html).toContain('gap-2');
      expect(html).toContain('gap-3');
    });

    it('uses proper padding classes', () => {
      expect(html).toContain('px-4');
      expect(html).toContain('py-2');
    });

    it('aligns actions to the right with ms-auto', () => {
      expect(html).toContain('ms-auto');
    });
  });

  describe('initHeader', () => {
    beforeEach(() => {
      // Create a fresh DOM for each test
      document.body.innerHTML = '<div id="header-container"></div>';
    });

    it('mounts header to the DOM when container exists', () => {
      const container = document.getElementById('header-container');
      expect(container.innerHTML).toBe('');

      initHeader();

      expect(container.innerHTML).not.toBe('');
      expect(container.innerHTML).toContain('<header id="main-header"');
    });

    it('sets innerHTML of header-container', () => {
      initHeader();

      const container = document.getElementById('header-container');
      const renderedHtml = renderHeader();

      expect(container.innerHTML).toBe(renderedHtml);
    });

    it('handles missing container gracefully', () => {
      document.body.innerHTML = ''; // Remove container

      // Should not throw
      expect(() => initHeader()).not.toThrow();
    });

    it('does not modify DOM when container is missing', () => {
      const originalHtml = '<div>Some other content</div>';
      document.body.innerHTML = originalHtml;

      initHeader();

      expect(document.body.innerHTML).toBe(originalHtml);
    });

    it('includes all expected elements after initialization', () => {
      initHeader();

      const container = document.getElementById('header-container');

      // Check for main header
      expect(container.querySelector('#main-header')).toBeTruthy();

      // Check for deployment status section
      expect(container.querySelector('#deployment-status-header')).toBeTruthy();
      expect(container.querySelector('#deployment-status-message')).toBeTruthy();
      expect(container.querySelector('#deployment-status-time')).toBeTruthy();
    });

    it('renders header with hidden deployment status by default', () => {
      initHeader();

      const deploymentStatus = document.getElementById('deployment-status-header');
      expect(deploymentStatus).toBeTruthy();
      expect(deploymentStatus.classList.contains('d-none')).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('renderHeader and initHeader produce consistent output', () => {
      document.body.innerHTML = '<div id="header-container"></div>';

      const directHtml = renderHeader();

      initHeader();
      const mountedHtml = document.getElementById('header-container').innerHTML;

      expect(mountedHtml).toBe(directHtml);
    });

    it('header can be re-initialized without errors', () => {
      document.body.innerHTML = '<div id="header-container"></div>';

      initHeader();
      const firstRender = document.getElementById('header-container').innerHTML;

      initHeader();
      const secondRender = document.getElementById('header-container').innerHTML;

      expect(secondRender).toBe(firstRender);
    });
  });
});
