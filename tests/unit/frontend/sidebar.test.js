/**
 * Unit Tests for Sidebar Component
 *
 * Tests the shared sidebar component that renders the admin navigation
 * with active state support and collapse functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderSidebar, initSidebar } from '../../../admin/js/components/sidebar.js';

describe('Sidebar Component', () => {
  describe('renderSidebar', () => {
    let html;

    describe('with default activePage (dashboard)', () => {
      beforeEach(() => {
        html = renderSidebar();
      });

      it('returns a non-empty string', () => {
        expect(html).toBeTruthy();
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
      });

      it('contains the main sidebar element', () => {
        expect(html).toContain('<aside id="admin-sidebar"');
        expect(html).toContain('</aside>');
      });

      it('includes correct sidebar styling classes', () => {
        expect(html).toContain('border-end');
        expect(html).toContain('d-flex');
        expect(html).toContain('flex-column');
      });

      it('includes navigation element with correct structure', () => {
        expect(html).toContain('<nav class="flex-grow-1 overflow-auto py-3">');
        expect(html).toContain('</nav>');
      });

      it('includes all navigation menu items', () => {
        const menuItems = [
          'Dashboard',
          'Posts',
          'Taxonomy',
          'Pages',
          'Media Library',
          'Bin',
          'Appearance',
          'Settings'
        ];

        menuItems.forEach(item => {
          expect(html).toContain(item);
        });
      });

      it('includes correct hrefs for all navigation items', () => {
        const hrefs = [
          'href="/admin/"',           // Dashboard
          'href="/admin/posts/"',     // Posts
          'href="/admin/taxonomy/"',  // Taxonomy
          'href="/admin/pages/"',     // Pages
          'href="/admin/media/"',     // Media Library
          'href="/admin/bin/"',       // Bin
          'href="/admin/appearance/"',// Appearance
          'href="/admin/settings/"'   // Settings
        ];

        hrefs.forEach(href => {
          expect(html).toContain(href);
        });
      });

      it('includes FontAwesome icons for all menu items', () => {
        const icons = [
          'fa-tachometer-alt',  // Dashboard
          'fa-file-alt',        // Posts
          'fa-tags',            // Taxonomy
          'fa-file',            // Pages
          'fa-image',           // Media Library
          'fa-trash-alt',       // Bin
          'fa-paint-brush',     // Appearance
          'fa-cog'              // Settings
        ];

        icons.forEach(icon => {
          expect(html).toContain(icon);
        });
      });

      it('marks dashboard as active by default', () => {
        // The first nav item should have the 'active' class
        const dashboardLinkMatch = html.match(/href="\/admin\/"[^>]*class="[^"]*active[^"]*"/);
        expect(dashboardLinkMatch).toBeTruthy();
      });

      it('does not mark other pages as active by default', () => {
        // Check that Posts link doesn't have active class
        const postsSection = html.substring(html.indexOf('href="/admin/posts/"'));
        const nextLinkEnd = postsSection.indexOf('</a>');
        const postsLink = postsSection.substring(0, nextLinkEnd);

        // Count 'active' occurrences - should not be in the posts link classes
        expect(postsLink).not.toMatch(/class="[^"]*active[^"]*"/);
      });

      it('includes sidebar toggle button', () => {
        expect(html).toContain('onclick="toggleSidebar()"');
        expect(html).toContain('Collapse');
      });

      it('includes collapse icon in toggle button', () => {
        expect(html).toContain('fa-angles-left');
        expect(html).toContain('sidebar-collapse-icon');
      });

      it('includes title attributes for accessibility', () => {
        const titles = [
          'title="Dashboard"',
          'title="Posts"',
          'title="Taxonomy"',
          'title="Pages"',
          'title="Media Library"',
          'title="Bin"',
          'title="Appearance"',
          'title="Settings"',
          'title="Collapse sidebar"'
        ];

        titles.forEach(title => {
          expect(html).toContain(title);
        });
      });

      it('uses consistent CSS classes for nav items', () => {
        expect(html).toContain('sidebar-nav-item');
        expect(html).toContain('sidebar-nav-text');
      });

      it('uses flexbox layout for nav items', () => {
        expect(html).toContain('d-flex');
        expect(html).toContain('align-items-center');
      });

      it('includes gap spacing for elements', () => {
        expect(html).toContain('gap-2');
        expect(html).toContain('gap-3');
      });
    });

    describe('with custom activePage', () => {
      it('marks posts as active when activePage is "posts"', () => {
        html = renderSidebar('posts');

        // Find the posts link and check for active class
        const postsLinkMatch = html.match(/href="\/admin\/posts\/"[^>]*class="[^"]*active[^"]*"/);
        expect(postsLinkMatch).toBeTruthy();

        // Dashboard should NOT be active
        const dashboardLinkMatch = html.match(/href="\/admin\/"[^>]*class="[^"]*active[^"]*"/);
        expect(dashboardLinkMatch).toBeFalsy();
      });

      it('marks taxonomy as active when activePage is "taxonomy"', () => {
        html = renderSidebar('taxonomy');

        const taxonomyLinkMatch = html.match(/href="\/admin\/taxonomy\/"[^>]*class="[^"]*active[^"]*"/);
        expect(taxonomyLinkMatch).toBeTruthy();
      });

      it('marks pages as active when activePage is "pages"', () => {
        html = renderSidebar('pages');

        const pagesLinkMatch = html.match(/href="\/admin\/pages\/"[^>]*class="[^"]*active[^"]*"/);
        expect(pagesLinkMatch).toBeTruthy();
      });

      it('marks media as active when activePage is "media"', () => {
        html = renderSidebar('media');

        const mediaLinkMatch = html.match(/href="\/admin\/media\/"[^>]*class="[^"]*active[^"]*"/);
        expect(mediaLinkMatch).toBeTruthy();
      });

      it('marks bin as active when activePage is "bin"', () => {
        html = renderSidebar('bin');

        const binLinkMatch = html.match(/href="\/admin\/bin\/"[^>]*class="[^"]*active[^"]*"/);
        expect(binLinkMatch).toBeTruthy();
      });

      it('marks appearance as active when activePage is "appearance"', () => {
        html = renderSidebar('appearance');

        const appearanceLinkMatch = html.match(/href="\/admin\/appearance\/"[^>]*class="[^"]*active[^"]*"/);
        expect(appearanceLinkMatch).toBeTruthy();
      });

      it('marks settings as active when activePage is "settings"', () => {
        html = renderSidebar('settings');

        const settingsLinkMatch = html.match(/href="\/admin\/settings\/"[^>]*class="[^"]*active[^"]*"/);
        expect(settingsLinkMatch).toBeTruthy();
      });

      it('handles unknown activePage gracefully (no items marked active)', () => {
        html = renderSidebar('unknown-page');

        // Count how many times 'active' appears in nav item classes
        // Should only appear in base class names like 'sidebar-nav-item', not as standalone 'active' class
        const navItems = html.match(/class="sidebar-nav-item[^"]*"/g) || [];
        const activeNavItems = navItems.filter(item => item.includes(' active ') || item.endsWith(' active"'));

        expect(activeNavItems.length).toBe(0);
      });
    });
  });

  describe('initSidebar', () => {
    beforeEach(() => {
      // Create a fresh DOM for each test
      document.body.innerHTML = '<div id="sidebar-container"></div>';
    });

    it('mounts sidebar to the DOM when container exists', () => {
      const container = document.getElementById('sidebar-container');
      expect(container.innerHTML).toBe('');

      initSidebar();

      expect(container.innerHTML).not.toBe('');
      expect(container.innerHTML).toContain('<aside id="admin-sidebar"');
    });

    it('sets innerHTML of sidebar-container', () => {
      initSidebar();

      const container = document.getElementById('sidebar-container');

      // Check that the container has the sidebar content
      expect(container.innerHTML).toContain('<aside id="admin-sidebar"');
      expect(container.innerHTML).toContain('href="/admin/"');
      expect(container.innerHTML).toContain('Dashboard');
    });

    it('handles missing container gracefully', () => {
      document.body.innerHTML = ''; // Remove container

      // Should not throw
      expect(() => initSidebar()).not.toThrow();
    });

    it('does not modify DOM when container is missing', () => {
      const originalHtml = '<div>Some other content</div>';
      document.body.innerHTML = originalHtml;

      initSidebar();

      expect(document.body.innerHTML).toBe(originalHtml);
    });

    it('passes activePage parameter to renderSidebar', () => {
      initSidebar('posts');

      const container = document.getElementById('sidebar-container');

      // Check that the sidebar was rendered with posts active
      expect(container.innerHTML).toContain('<aside id="admin-sidebar"');
      expect(container.innerHTML).toContain('sidebar-nav-item active');

      // Verify posts link has active class
      const postsLink = container.querySelector('a[href="/admin/posts/"]');
      expect(postsLink.className).toContain('active');
    });

    it('includes all expected navigation items after initialization', () => {
      initSidebar();

      const container = document.getElementById('sidebar-container');

      // Check for main sidebar
      expect(container.querySelector('#admin-sidebar')).toBeTruthy();

      // Check for navigation
      expect(container.querySelector('nav')).toBeTruthy();

      // Check for all links
      expect(container.querySelector('a[href="/admin/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/posts/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/taxonomy/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/pages/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/media/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/bin/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/appearance/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/settings/"]')).toBeTruthy();
    });

    it('renders sidebar with dashboard active by default', () => {
      initSidebar();

      const container = document.getElementById('sidebar-container');
      const dashboardLink = container.querySelector('a[href="/admin/"]');

      expect(dashboardLink).toBeTruthy();
      expect(dashboardLink.className).toContain('active');
    });

    it('renders sidebar with correct active page when specified', () => {
      initSidebar('taxonomy');

      const container = document.getElementById('sidebar-container');
      const taxonomyLink = container.querySelector('a[href="/admin/taxonomy/"]');

      expect(taxonomyLink).toBeTruthy();
      expect(taxonomyLink.className).toContain('active');
    });
  });

  describe('toggleSidebar', () => {
    beforeEach(() => {
      // Create a fresh DOM for each test
      document.body.innerHTML = '<div id="sidebar-container"></div>';
      document.body.classList.remove('sidebar-collapsed');
    });

    it('exists as a global function', () => {
      expect(typeof window.toggleSidebar).toBe('function');
    });

    it('adds sidebar-collapsed class to body when not present', () => {
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);

      window.toggleSidebar();

      expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
    });

    it('removes sidebar-collapsed class from body when present', () => {
      document.body.classList.add('sidebar-collapsed');
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);

      window.toggleSidebar();

      expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
    });

    it('toggles state multiple times correctly', () => {
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);

      window.toggleSidebar();
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);

      window.toggleSidebar();
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);

      window.toggleSidebar();
      expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('renderSidebar and initSidebar produce consistent output', () => {
      document.body.innerHTML = '<div id="sidebar-container"></div>';

      initSidebar();
      const container = document.getElementById('sidebar-container');

      // Verify the sidebar was mounted correctly
      expect(container.innerHTML).toContain('<aside id="admin-sidebar"');
      expect(container.innerHTML).toContain('Dashboard');
      expect(container.innerHTML).toContain('Posts');

      // Verify all navigation links are present
      expect(container.querySelector('a[href="/admin/"]')).toBeTruthy();
      expect(container.querySelector('a[href="/admin/posts/"]')).toBeTruthy();
    });

    it('sidebar can be re-initialized without errors', () => {
      document.body.innerHTML = '<div id="sidebar-container"></div>';

      initSidebar();
      const firstRender = document.getElementById('sidebar-container').innerHTML;

      initSidebar();
      const secondRender = document.getElementById('sidebar-container').innerHTML;

      expect(secondRender).toBe(firstRender);
    });

    it('sidebar can be re-initialized with different activePage', () => {
      document.body.innerHTML = '<div id="sidebar-container"></div>';

      initSidebar('dashboard');
      const dashboardHtml = document.getElementById('sidebar-container').innerHTML;

      initSidebar('posts');
      const postsHtml = document.getElementById('sidebar-container').innerHTML;

      expect(postsHtml).not.toBe(dashboardHtml);
      expect(postsHtml).toContain('sidebar-nav-item active');
    });
  });
});
