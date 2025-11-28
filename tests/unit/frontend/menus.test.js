/**
 * Unit Tests for Menus Module
 *
 * Tests the complete menus module including menu management,
 * CRUD operations, drag-and-drop reordering, and auto-save functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock deployments module before imports
vi.mock('../../../admin/js/modules/deployments.js', () => ({
  trackDeployment: vi.fn()
}));

import {
  loadMenus,
  switchMenuLocation,
  renderMenuBuilder,
  toggleMenuChildren,
  showAddMenuItemModal,
  updateAddItemForm,
  editMenuItem,
  updateEditItemForm,
  saveEditedMenuItem,
  deleteMenuItem,
  saveMenus,
  clearMenuCache
} from '../../../admin/js/modules/menus.js';
import { trackDeployment } from '../../../admin/js/modules/deployments.js';
import { initNotifications } from '../../../admin/js/ui/notifications.js';

describe('Menus Module', () => {
  let mockFetch;
  let mockSortable;
  let mockBootstrapModal;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="error" class="d-none"><p></p></div>
      <div id="success" class="d-none"><p></p></div>

      <!-- Menu tabs -->
      <button id="tab-header-menu"></button>
      <button id="tab-mobile-menu"></button>
      <button id="tab-footer-menu"></button>

      <!-- Count badges -->
      <span id="header-menu-count-badge">0</span>
      <span id="mobile-menu-count-badge">0</span>
      <span id="footer-menu-count-badge">0</span>

      <!-- Tab content -->
      <div id="menu-header-tab" class="tab-pane active">
        <table>
          <tbody id="menu-header-list"></tbody>
        </table>
      </div>
      <div id="menu-mobile-tab" class="tab-pane">
        <table>
          <tbody id="menu-mobile-list"></tbody>
        </table>
      </div>
      <div id="menu-footer-tab" class="tab-pane">
        <table>
          <tbody id="menu-footer-list"></tbody>
        </table>
      </div>

      <!-- Add menu item form -->
      <select id="new-item-type">
        <option value="category">Category</option>
        <option value="page">Page</option>
        <option value="custom">Custom Link</option>
        <option value="heading">Heading</option>
        <option value="category_dynamic">Dynamic Category</option>
      </select>
      <input type="text" id="new-item-label" />
      <input type="text" id="new-item-url" />
      <input type="text" id="new-item-filter" />
      <input type="text" id="new-item-section" />
      <input type="text" id="new-item-icon" />
      <input type="checkbox" id="new-item-mega-menu" />
      <input type="checkbox" id="new-item-accordion" />

      <div id="add-item-url-group"></div>
      <div id="add-item-filter-group"></div>
      <div id="add-item-section-group"></div>
      <div id="add-item-icon-group"></div>
      <div id="add-item-mega-menu-group"></div>
      <div id="add-item-accordion-group"></div>

      <!-- Save button -->
      <button id="save-btn">Save Changes</button>
    `;

    // Initialize notifications module with new DOM
    initNotifications();

    // Setup window globals
    window.API_BASE = '/.netlify/functions';
    window.headerMenu = [];
    window.mobileMenu = [];
    window.footerMenu = [];
    window.currentMenuLocation = 'header';
    window.lastSavedState = '';
    window.isDirty = false;
    window.sortableInstances = { header: null, mobile: null, footer: null };

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock Sortable.js
    mockSortable = {
      destroy: vi.fn(),
      option: vi.fn(),
    };
    const MockSortable = function() {
      return mockSortable;
    };
    global.Sortable = MockSortable;

    // Mock Bootstrap Modal
    mockBootstrapModal = {
      show: vi.fn(),
      hide: vi.fn()
    };

    // Create a proper constructor function for Bootstrap Modal
    const MockBootstrapModal = vi.fn(function() {
      return mockBootstrapModal;
    });
    MockBootstrapModal.getInstance = vi.fn(() => mockBootstrapModal);

    global.bootstrap = {
      Modal: MockBootstrapModal
    };

    // Mock window functions
    window.showModal = vi.fn();
    window.showConfirm = vi.fn();

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadMenus', () => {
    it('loads menus from API on first load', async () => {
      const mockData = {
        header_menu: [
          { id: 'about', type: 'page', label: 'About', url: '/about/' }
        ],
        mobile_menu: [],
        footer_menu: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await loadMenus();

      expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/menus');
      expect(window.headerMenu).toEqual(mockData.header_menu);
      expect(window.mobileMenu).toEqual([]);
      expect(window.footerMenu).toEqual([]);
    });

    it('loads menus from cache on subsequent loads', async () => {
      const mockData = {
        header_menu: [
          { id: 'cached', type: 'page', label: 'Cached', url: '/cached/' }
        ],
        mobile_menu: [],
        footer_menu: []
      };

      // Set cache
      localStorage.setItem('admin_menus_cache_v1', JSON.stringify({
        data: mockData,
        timestamp: Date.now()
      }));

      await loadMenus();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(window.headerMenu).toEqual(mockData.header_menu);
    });

    it('handles empty menus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          header_menu: [],
          mobile_menu: [],
          footer_menu: []
        })
      });

      await loadMenus();

      expect(window.headerMenu).toEqual([]);
      expect(window.mobileMenu).toEqual([]);
      expect(window.footerMenu).toEqual([]);
    });

    it('shows error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      await loadMenus();

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });
  });

  describe('switchMenuLocation', () => {
    beforeEach(() => {
      window.headerMenu = [
        { id: 'header1', type: 'page', label: 'Header 1', url: '/h1/' }
      ];
      window.mobileMenu = [
        { id: 'mobile1', type: 'page', label: 'Mobile 1', url: '/m1/' }
      ];
    });

    it('switches to header menu', () => {
      window.currentMenuLocation = 'footer';
      switchMenuLocation('header');

      expect(window.currentMenuLocation).toBe('header');
      const headerTab = document.getElementById('tab-header-menu');
      expect(headerTab.classList.contains('active')).toBe(true);
    });

    it('switches to footer menu', () => {
      switchMenuLocation('footer');

      expect(window.currentMenuLocation).toBe('footer');
      const footerTab = document.getElementById('tab-footer-menu');
      expect(footerTab.classList.contains('active')).toBe(true);
    });

    it('updates tab content visibility', () => {
      switchMenuLocation('footer');

      const headerContent = document.getElementById('menu-header-tab');
      const footerContent = document.getElementById('menu-footer-tab');

      expect(headerContent.classList.contains('active')).toBe(false);
      expect(footerContent.classList.contains('active')).toBe(true);
    });
  });

  describe('renderMenuBuilder', () => {
    it('renders menu items correctly', () => {
      window.headerMenu = [
        { id: 'about', type: 'page', label: 'About', url: '/about/' },
        { id: 'contact', type: 'page', label: 'Contact', url: '/contact/' }
      ];
      window.currentMenuLocation = 'header';

      renderMenuBuilder();

      const tbody = document.getElementById('menu-header-list');
      expect(tbody.innerHTML).toContain('About');
      expect(tbody.innerHTML).toContain('Contact');

      const countBadge = document.getElementById('header-menu-count-badge');
      expect(countBadge.textContent).toBe('2');
    });

    it('renders nested menu items with children', () => {
      window.headerMenu = [
        {
          id: 'projects',
          type: 'category',
          label: 'Projects',
          url: '/category/projects/',
          children: [
            { id: 'photo', type: 'category', label: 'Photography', url: '/category/photo/' }
          ]
        }
      ];
      window.currentMenuLocation = 'header';

      renderMenuBuilder();

      const tbody = document.getElementById('menu-header-list');
      expect(tbody.innerHTML).toContain('Projects');
      expect(tbody.innerHTML).toContain('Photography');

      const countBadge = document.getElementById('header-menu-count-badge');
      expect(countBadge.textContent).toBe('2');  // Parent + child
    });

    it('shows empty state when no menu items', () => {
      window.headerMenu = [];
      window.currentMenuLocation = 'header';

      renderMenuBuilder();

      const tbody = document.getElementById('menu-header-list');
      expect(tbody.innerHTML).toContain('No menu items yet');
    });

    it('renders different menu item types with correct badges', () => {
      window.headerMenu = [
        { id: 'cat', type: 'category', label: 'Category', url: '/cat/' },
        { id: 'page', type: 'page', label: 'Page', url: '/page/' },
        { id: 'custom', type: 'custom', label: 'Custom', url: 'https://example.com' },
        { id: 'heading', type: 'heading', label: 'Heading' }
      ];
      window.currentMenuLocation = 'header';

      renderMenuBuilder();

      const tbody = document.getElementById('menu-header-list');
      expect(tbody.innerHTML).toContain('bg-primary');     // category
      expect(tbody.innerHTML).toContain('bg-success');     // page
      expect(tbody.innerHTML).toContain('bg-warning');     // custom
      expect(tbody.innerHTML).toContain('bg-secondary');   // heading
    });
  });

  describe('toggleMenuChildren', () => {
    beforeEach(() => {
      window.headerMenu = [
        {
          id: 'parent',
          type: 'category',
          label: 'Parent',
          url: '/parent/',
          children: [
            { id: 'child', type: 'page', label: 'Child', url: '/child/' }
          ]
        }
      ];
      window.currentMenuLocation = 'header';
      renderMenuBuilder();
    });

    it('toggles child visibility', () => {
      // Add data-parent attribute to child element for test
      const tbody = document.getElementById('menu-header-list');
      const rows = tbody.querySelectorAll('tr');
      if (rows.length > 1) {
        rows[1].setAttribute('data-parent', '0');
      }

      toggleMenuChildren(0);

      const childRow = tbody.querySelector('[data-parent="0"]');
      if (childRow) {
        expect(childRow.classList.contains('d-none')).toBe(true);
      }
    });
  });

  describe('updateAddItemForm', () => {
    it('shows URL field for category type', () => {
      document.getElementById('new-item-type').value = 'category';
      updateAddItemForm();

      const urlGroup = document.getElementById('add-item-url-group');
      expect(urlGroup.classList.contains('d-none')).toBe(false);
    });

    it('shows filter field for dynamic category type', () => {
      document.getElementById('new-item-type').value = 'category_dynamic';
      updateAddItemForm();

      const filterGroup = document.getElementById('add-item-filter-group');
      const sectionGroup = document.getElementById('add-item-section-group');
      expect(filterGroup.classList.contains('d-none')).toBe(false);
      expect(sectionGroup.classList.contains('d-none')).toBe(false);
    });

    it('shows icon field for heading type', () => {
      document.getElementById('new-item-type').value = 'heading';
      updateAddItemForm();

      const iconGroup = document.getElementById('add-item-icon-group');
      expect(iconGroup.classList.contains('d-none')).toBe(false);
    });
  });

  describe('showAddMenuItemModal', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'abc123' })
      });
    });

    it('adds a page menu item', async () => {
      document.getElementById('new-item-type').value = 'page';
      document.getElementById('new-item-label').value = 'Test Page';
      document.getElementById('new-item-url').value = '/test/';

      window.currentMenuLocation = 'header';
      window.headerMenu = [];

      await showAddMenuItemModal();

      expect(window.headerMenu.length).toBe(1);
      expect(window.headerMenu[0].label).toBe('Test Page');
      expect(window.headerMenu[0].url).toBe('/test/');
      expect(window.headerMenu[0].type).toBe('page');
    });

    it('adds a category menu item with mega menu', async () => {
      document.getElementById('new-item-type').value = 'category';
      document.getElementById('new-item-label').value = 'Test Category';
      document.getElementById('new-item-url').value = '/category/test/';
      document.getElementById('new-item-mega-menu').checked = true;

      window.currentMenuLocation = 'header';
      window.headerMenu = [];

      await showAddMenuItemModal();

      expect(window.headerMenu[0].mega_menu).toBe(true);
    });

    it('adds a heading menu item with icon', async () => {
      document.getElementById('new-item-type').value = 'heading';
      document.getElementById('new-item-label').value = 'Section Heading';
      document.getElementById('new-item-icon').value = 'fas fa-graduation-cap';

      window.currentMenuLocation = 'header';
      window.headerMenu = [];

      await showAddMenuItemModal();

      expect(window.headerMenu[0].type).toBe('heading');
      expect(window.headerMenu[0].icon).toBe('fas fa-graduation-cap');
    });

    it('shows error when required fields are missing', async () => {
      document.getElementById('new-item-type').value = 'page';
      document.getElementById('new-item-label').value = '';  // Missing label
      document.getElementById('new-item-url').value = '/test/';

      await showAddMenuItemModal();

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });

    it('calls saveMenus after adding item', async () => {
      document.getElementById('new-item-type').value = 'page';
      document.getElementById('new-item-label').value = 'Test';
      document.getElementById('new-item-url').value = '/test/';

      window.currentMenuLocation = 'header';
      window.headerMenu = [];

      await showAddMenuItemModal();

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/menus',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });
  });

  describe('editMenuItem', () => {
    beforeEach(() => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test Page', url: '/test/' }
      ];
      window.currentMenuLocation = 'header';
    });

    it('opens edit modal with item data', async () => {
      await editMenuItem(0);

      expect(global.bootstrap.Modal).toHaveBeenCalled();
      expect(mockBootstrapModal.show).toHaveBeenCalled();

      // Check if modal was added to DOM
      const modal = document.getElementById('editMenuItemModal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Test Page');
    });

    it('shows error when item not found', async () => {
      await editMenuItem(999);

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });

    it('populates form fields with item data', async () => {
      window.headerMenu = [
        {
          id: 'cat',
          type: 'category',
          label: 'My Category',
          url: '/cat/',
          mega_menu: true
        }
      ];

      await editMenuItem(0);

      const modal = document.getElementById('editMenuItemModal');
      expect(modal.innerHTML).toContain('My Category');
      expect(modal.innerHTML).toContain('checked');  // mega_menu checkbox
    });
  });

  describe('updateEditItemForm', () => {
    beforeEach(async () => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test', url: '/test/' }
      ];
      window.currentMenuLocation = 'header';
      await editMenuItem(0);
    });

    it('shows URL field for page type', () => {
      document.getElementById('edit-item-type').value = 'page';
      updateEditItemForm();

      const urlGroup = document.getElementById('edit-item-url-group');
      expect(urlGroup.classList.contains('d-none')).toBe(false);
    });
  });

  describe('saveEditedMenuItem', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'abc123' })
      });

      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Old Label', url: '/old/' }
      ];
      window.currentMenuLocation = 'header';
      await editMenuItem(0);
    });

    it('saves edited menu item', async () => {
      document.getElementById('edit-item-type').value = 'page';
      document.getElementById('edit-item-label').value = 'New Label';
      document.getElementById('edit-item-url').value = '/new/';

      await saveEditedMenuItem(0);

      expect(window.headerMenu[0].label).toBe('New Label');
      expect(window.headerMenu[0].url).toBe('/new/');
    });

    it('changes item type from page to heading', async () => {
      document.getElementById('edit-item-type').value = 'heading';
      document.getElementById('edit-item-label').value = 'Section Header';
      document.getElementById('edit-item-icon').value = 'fas fa-star';

      await saveEditedMenuItem(0);

      expect(window.headerMenu[0].type).toBe('heading');
      expect(window.headerMenu[0].icon).toBe('fas fa-star');
      expect(window.headerMenu[0].url).toBeUndefined();  // URL removed for headings
    });

    it('shows error when required fields missing', async () => {
      document.getElementById('edit-item-label').value = '';  // Empty label

      await saveEditedMenuItem(0);

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });

    it('closes modal after saving', async () => {
      document.getElementById('edit-item-label').value = 'Updated';
      document.getElementById('edit-item-url').value = '/updated/';

      await saveEditedMenuItem(0);

      expect(mockBootstrapModal.hide).toHaveBeenCalled();
    });

    it('calls saveMenus after editing', async () => {
      document.getElementById('edit-item-label').value = 'Updated';
      document.getElementById('edit-item-url').value = '/updated/';

      await saveEditedMenuItem(0);

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/menus',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });
  });

  describe('deleteMenuItem', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commitSha: 'abc123' })
      });
    });

    it('deletes menu item after confirmation', async () => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test Page', url: '/test/' }
      ];
      window.currentMenuLocation = 'header';
      window.showConfirm.mockResolvedValue(true);

      await deleteMenuItem(0);

      expect(window.headerMenu.length).toBe(0);
    });

    it('does not delete if user cancels', async () => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test Page', url: '/test/' }
      ];
      window.currentMenuLocation = 'header';
      window.showConfirm.mockResolvedValue(false);

      await deleteMenuItem(0);

      expect(window.headerMenu.length).toBe(1);
    });

    it('shows warning for items with children', async () => {
      window.headerMenu = [
        {
          id: 'parent',
          type: 'category',
          label: 'Parent',
          url: '/parent/',
          children: [
            { id: 'child1', type: 'page', label: 'Child 1', url: '/c1/' },
            { id: 'child2', type: 'page', label: 'Child 2', url: '/c2/' }
          ]
        }
      ];
      window.currentMenuLocation = 'header';
      window.showConfirm.mockResolvedValue(true);

      await deleteMenuItem(0);

      expect(window.showConfirm).toHaveBeenCalledWith(
        expect.stringContaining('2 child items')
      );
    });

    it('calls saveMenus after deleting', async () => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test', url: '/test/' }
      ];
      window.currentMenuLocation = 'header';
      window.showConfirm.mockResolvedValue(true);

      await deleteMenuItem(0);

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/menus',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('shows error when item not found', async () => {
      window.headerMenu = [];
      window.currentMenuLocation = 'header';

      await deleteMenuItem(0);

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });
  });

  describe('saveMenus', () => {
    it('saves menus to API', async () => {
      window.headerMenu = [
        { id: 'test', type: 'page', label: 'Test', url: '/test/' }
      ];
      window.mobileMenu = [];
      window.footerMenu = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          commitSha: 'test-sha-123'
        })
      });

      await saveMenus();

      // Mobile menu should be auto-generated from header menu
      const expectedMobileMenu = [
        { id: 'test', type: 'page', label: 'Test', url: '/test/' }
      ];

      expect(mockFetch).toHaveBeenCalledWith(
        '/.netlify/functions/menus',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            header_menu: window.headerMenu,
            mobile_menu: expectedMobileMenu,
            footer_menu: window.footerMenu
          })
        })
      );
    });

    it('converts mega_menu to accordion in mobile menu', async () => {
      window.headerMenu = [
        {
          id: 'projects',
          type: 'category',
          label: 'Projects',
          url: '/projects/',
          mega_menu: true,
          children: [
            { id: 'child1', type: 'category', label: 'Child 1', url: '/child1/' }
          ]
        }
      ];
      window.mobileMenu = [];
      window.footerMenu = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await saveMenus();

      // Mobile menu should have accordion instead of mega_menu
      const expectedMobileMenu = [
        {
          id: 'projects',
          type: 'category',
          label: 'Projects',
          url: '/projects/',
          accordion: true,
          children: [
            { id: 'child1', type: 'category', label: 'Child 1', url: '/child1/' }
          ]
        }
      ];

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.mobile_menu).toEqual(expectedMobileMenu);
      expect(body.mobile_menu[0].mega_menu).toBeUndefined();
    });

    it('tracks deployment after save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          commitSha: 'commit-abc-123'
        })
      });

      await saveMenus();

      expect(trackDeployment).toHaveBeenCalledWith(
        'commit-abc-123',
        'Update menus',
        'menus.yml'
      );
    });

    it('shows success message on save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await saveMenus();

      const successElement = document.getElementById('success');
      expect(successElement.classList.contains('d-none')).toBe(false);
      expect(successElement.textContent).toContain('saved successfully');
    });

    it('shows error on save failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to save' })
      });

      await saveMenus();

      const errorElement = document.getElementById('error');
      expect(errorElement.classList.contains('d-none')).toBe(false);
    });

    it('updates cache after successful save', async () => {
      window.headerMenu = [
        { id: 'cached', type: 'page', label: 'Cached', url: '/cached/' }
      ];
      window.mobileMenu = [];
      window.footerMenu = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await saveMenus();

      const cached = JSON.parse(localStorage.getItem('admin_menus_cache_v1'));
      expect(cached.data.header_menu).toEqual(window.headerMenu);
    });
  });

  describe('clearMenuCache()', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <button id="clear-cache-btn">Clear Cache</button>
      `;

      // Set up global menus
      window.headerMenu = [
        { id: 'about', type: 'page', label: 'About', url: '/about/' }
      ];
      window.mobileMenu = [];
      window.footerMenu = [];

      // Pre-populate cache
      localStorage.setItem('admin_menus_cache_v1', JSON.stringify({
        timestamp: Date.now(),
        data: {
          header_menu: window.headerMenu,
          mobile_menu: [],
          footer_menu: []
        }
      }));
    });

    it('clears backend cache via DELETE request', async () => {
      // Mock successful DELETE response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Menu cache cleared successfully' })
      });

      // Mock successful GET response for reload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          header_menu: [{ id: 'fresh', type: 'page', label: 'Fresh', url: '/fresh/' }],
          mobile_menu: [],
          footer_menu: []
        })
      });

      await clearMenuCache();

      // Verify DELETE request was made
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/menus'),
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('clears local localStorage cache and repopulates with fresh data', async () => {
      // Verify old cache exists before clearing
      const oldCache = JSON.parse(localStorage.getItem('admin_menus_cache_v1'));
      expect(oldCache.data.header_menu[0].id).toBe('about');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const freshMenuData = {
        header_menu: [{ id: 'fresh', type: 'page', label: 'Fresh', url: '/fresh/' }],
        mobile_menu: [],
        footer_menu: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => freshMenuData
      });

      await clearMenuCache();

      // Verify cache was repopulated with fresh data (loadMenus recreates it)
      const newCache = JSON.parse(localStorage.getItem('admin_menus_cache_v1'));
      expect(newCache.data.header_menu[0].id).toBe('fresh');
    });

    it('reloads fresh menu data after clearing cache', async () => {
      const freshMenuData = {
        header_menu: [
          { id: 'fresh1', type: 'page', label: 'Fresh Item 1', url: '/fresh1/' },
          { id: 'fresh2', type: 'page', label: 'Fresh Item 2', url: '/fresh2/' }
        ],
        mobile_menu: [
          { id: 'mobile1', type: 'page', label: 'Mobile Item', url: '/mobile/' }
        ],
        footer_menu: []
      };

      // Mock DELETE success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock GET with fresh data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => freshMenuData
      });

      await clearMenuCache();

      // Verify fresh data was loaded
      expect(window.headerMenu).toEqual(freshMenuData.header_menu);
      expect(window.mobileMenu).toEqual(freshMenuData.mobile_menu);
    });

    it('handles backend DELETE failure without throwing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Backend error', message: 'Failed to clear cache' })
      });

      // This should catch the error internally and not throw
      await expect(clearMenuCache()).resolves.not.toThrow();
    });

    it('sets button to loading state during operation', async () => {
      const clearCacheBtn = document.getElementById('clear-cache-btn');

      let buttonTextDuringFetch = '';
      mockFetch.mockImplementationOnce(async () => {
        // Capture button state during fetch
        buttonTextDuringFetch = clearCacheBtn.textContent;
        return {
          ok: true,
          json: async () => ({ success: true })
        };
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          header_menu: [],
          mobile_menu: [],
          footer_menu: []
        })
      });

      await clearMenuCache();

      expect(buttonTextDuringFetch).toContain('Clearing');
    });
  });
});
