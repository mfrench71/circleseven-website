/**
 * Unit Tests for Image Chooser Module
 *
 * Tests custom modal-based image chooser that integrates with the Media Library.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  openImageChooser,
  changeChooserPage,
  filterChooserMedia,
  selectChooserImage
} from '../../../admin/js/modules/image-chooser.js';
import { initNotifications } from '../../../admin/js/ui/notifications.js';

describe('Image Chooser Module', () => {
  let mockFetch;
  let mockCallback;

  beforeEach(() => {
    // Mock Bootstrap Modal
    global.bootstrap = {
      Modal: class {
        constructor(element) {
          this.element = element;
          this.isVisible = false;
        }
        show() {
          // Only operate on elements still connected to DOM
          if (this.element && this.element.isConnected) {
            this.element.classList.remove('d-none');
            this.isVisible = true;
          }
        }
        hide() {
          // Only operate on elements still connected to DOM
          if (this.element && this.element.isConnected) {
            this.element.classList.add('d-none');
            this.isVisible = false;
          }
        }
      }
    };

    // Setup DOM with modal structure
    document.body.innerHTML = `
      <div id="error" class="d-none"><p></p></div>
      <div id="success" class="d-none"><p></p></div>

      <div class="modal fade" id="imageChooserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Choose Featured Image</h5>
            </div>
            <div class="modal-body">
              <div class="p-3">
                <div class="row g-2">
                  <div class="col-md-6">
                    <input type="text" id="chooser-search" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <select id="chooser-folder" class="form-select">
                      <option value="">All Folders</option>
                    </select>
                  </div>
                </div>
                <div id="chooser-multi-controls" class="d-none mt-2">
                  <span id="chooser-selection-count"></span>
                </div>
              </div>
              <div id="chooser-grid" class="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-3 p-3"></div>
              <div id="chooser-empty" class="d-none text-center p-5">
                <p class="text-muted">No images found</p>
              </div>
              <div id="chooser-pagination" class="d-none p-3">
                <button id="chooser-prev" class="btn btn-sm btn-outline-secondary">Previous</button>
                <span id="chooser-current-page">1</span> / <span id="chooser-total-pages">1</span>
                <button id="chooser-next" class="btn btn-sm btn-outline-secondary">Next</button>
              </div>
            </div>
            <div id="chooser-modal-footer" class="modal-footer d-none">
              <button type="button" class="btn btn-primary">Insert Selected</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize notifications
    initNotifications();

    // Setup window globals
    window.API_BASE = '/.netlify/functions';

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock callback
    mockCallback = vi.fn();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.bootstrap;
  });

  describe('openImageChooser', () => {
    const mockMediaResponse = {
      resources: [
        {
          public_id: 'folder/image1',
          secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/image1.jpg',
          resource_type: 'image',
          width: 1920,
          height: 1080,
          bytes: 245760,
          created_at: '2025-10-20T10:00:00Z'
        },
        {
          public_id: 'folder/image2',
          secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/image2.jpg',
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: '2025-10-19T10:00:00Z'
        },
        {
          public_id: 'folder/video',
          secure_url: 'https://res.cloudinary.com/circleseven/video/upload/v1234567890/folder/video.mp4',
          resource_type: 'video',
          width: 1280,
          height: 720,
          bytes: 1048576,
          created_at: '2025-10-18T10:00:00Z'
        }
      ]
    };

    it('fetches media from API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/media');
    });

    it('shows modal when opened', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const modal = document.getElementById('imageChooserModal');
      expect(modal).toBeTruthy();
      expect(modal.classList.contains('d-none')).toBe(false);
    });

    it('reuses existing modal element', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      // First call uses modal
      await openImageChooser(mockCallback);
      const firstModal = document.getElementById('imageChooserModal');

      // Second call should reuse same modal
      await openImageChooser(mockCallback);
      const secondModal = document.getElementById('imageChooserModal');

      expect(firstModal).toBe(secondModal);
    });

    it('displays modal without d-none class', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const modal = document.getElementById('imageChooserModal');
      expect(modal.classList.contains('d-none')).toBe(false);
    });

    it('stores callback function', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      // Callback should be stored for later use
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('resets to first page on open', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      // Simulate being on page 2
      await openImageChooser(mockCallback);
      changeChooserPage(1);

      // Open again should reset to page 1
      await openImageChooser(mockCallback);

      const currentPage = document.getElementById('chooser-current-page');
      expect(currentPage?.textContent).toBe('1');
    });

    it('renders image grid with fetched media', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      expect(grid).toBeTruthy();
      // Should only show images (not videos)
      expect(grid.innerHTML).toContain('image1');
      expect(grid.innerHTML).toContain('image2');
    });

    it('filters out non-image resources', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      // Should not contain video
      expect(grid.innerHTML).not.toContain('video');
    });

    it('shows error when API fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await openImageChooser(mockCallback);

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('d-none')).toBe(false);
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await openImageChooser(mockCallback);

      const errorEl = document.getElementById('error');
      expect(errorEl.classList.contains('d-none')).toBe(false);
    });

    it('handles empty resources array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ resources: [] })
      });

      await openImageChooser(mockCallback);

      const emptyEl = document.getElementById('chooser-empty');
      expect(emptyEl?.classList.contains('d-none')).toBe(false);
    });

    it('handles missing resources property', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await openImageChooser(mockCallback);

      const emptyEl = document.getElementById('chooser-empty');
      expect(emptyEl?.classList.contains('d-none')).toBe(false);
    });

    it('sorts images by most recent first', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      const html = grid.innerHTML;

      // More recent image should appear before older
      const image1Pos = html.indexOf('image1');
      const image2Pos = html.indexOf('image2');
      expect(image1Pos).toBeLessThan(image2Pos);
    });

    it('generates thumbnail URLs with transformations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMediaResponse
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      expect(grid.innerHTML).toContain('/upload/w_200,h_200,c_fill/');
    });

    it('escapes HTML in filenames', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          resources: [{
            public_id: 'folder/<script>alert("XSS")</script>',
            secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/image.jpg',
            resource_type: 'image',
            width: 800,
            height: 600,
            bytes: 102400,
            created_at: new Date().toISOString()
          }]
        })
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      // Should not contain executable script
      expect(grid.querySelector('script')).toBeNull();
    });
  });

  describe('changeChooserPage', () => {
    beforeEach(async () => {
      // Create 25 images for pagination testing
      const manyImages = {
        resources: Array.from({ length: 25 }, (_, i) => ({
          public_id: `image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date(Date.now() - i * 1000).toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyImages
      });

      await openImageChooser(mockCallback);
    });

    it('changes page by delta', () => {
      changeChooserPage(1);

      const currentPage = document.getElementById('chooser-current-page');
      expect(currentPage.textContent).toBe('2');
    });

    it('can go to previous page', () => {
      changeChooserPage(1); // Go to page 2
      changeChooserPage(-1); // Go back to page 1

      const currentPage = document.getElementById('chooser-current-page');
      expect(currentPage.textContent).toBe('1');
    });

    it('updates grid to show new page items', () => {
      changeChooserPage(1);

      const grid = document.getElementById('chooser-grid');
      // Page 2 should show items 12-23 (12 per page)
      expect(grid.children.length).toBe(12);
    });

    it('disables prev button on first page', () => {
      const prevBtn = document.getElementById('chooser-prev');
      expect(prevBtn.disabled).toBe(true);
    });

    it('enables prev button when not on first page', () => {
      changeChooserPage(1);

      const prevBtn = document.getElementById('chooser-prev');
      expect(prevBtn.disabled).toBe(false);
    });

    it('disables next button on last page', () => {
      changeChooserPage(1); // Page 2
      changeChooserPage(1); // Page 3 (last page with 25 items, 12 per page)

      const nextBtn = document.getElementById('chooser-next');
      expect(nextBtn.disabled).toBe(true);
    });

    it('enables next button when not on last page', () => {
      changeChooserPage(1); // Page 2

      const nextBtn = document.getElementById('chooser-next');
      expect(nextBtn.disabled).toBe(false);
    });
  });

  describe('filterChooserMedia', () => {
    beforeEach(async () => {
      const mockMedia = {
        resources: [
          {
            public_id: 'folder/cat-photo',
            secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/cat-photo.jpg',
            resource_type: 'image',
            width: 800,
            height: 600,
            bytes: 102400,
            created_at: new Date().toISOString()
          },
          {
            public_id: 'folder/dog-photo',
            secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/dog-photo.jpg',
            resource_type: 'image',
            width: 800,
            height: 600,
            bytes: 102400,
            created_at: new Date().toISOString()
          },
          {
            public_id: 'folder/bird-photo',
            secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/bird-photo.jpg',
            resource_type: 'image',
            width: 800,
            height: 600,
            bytes: 102400,
            created_at: new Date().toISOString()
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMedia
      });

      await openImageChooser(mockCallback);
    });

    it('resets to first page when filtering', () => {
      changeChooserPage(1); // Go to page 2
      filterChooserMedia();

      const currentPage = document.getElementById('chooser-current-page');
      expect(currentPage?.textContent).toBe('1');
    });

    it('filters images by search term', () => {
      const searchInput = document.getElementById('chooser-search');
      searchInput.value = 'cat';

      filterChooserMedia();

      const grid = document.getElementById('chooser-grid');
      expect(grid.innerHTML).toContain('cat-photo');
      expect(grid.innerHTML).not.toContain('dog-photo');
      expect(grid.innerHTML).not.toContain('bird-photo');
    });

    it('is case insensitive', () => {
      const searchInput = document.getElementById('chooser-search');
      searchInput.value = 'CAT';

      filterChooserMedia();

      const grid = document.getElementById('chooser-grid');
      expect(grid.innerHTML).toContain('cat-photo');
    });

    it('shows empty state when no matches', () => {
      const searchInput = document.getElementById('chooser-search');
      searchInput.value = 'nonexistent';

      filterChooserMedia();

      const grid = document.getElementById('chooser-grid');
      const emptyEl = document.getElementById('chooser-empty');

      expect(grid.innerHTML).toBe('');
      expect(emptyEl?.classList.contains('d-none')).toBe(false);
    });

    it('shows all images when search is empty', () => {
      const searchInput = document.getElementById('chooser-search');
      searchInput.value = 'cat';
      filterChooserMedia();

      // Clear search
      searchInput.value = '';
      filterChooserMedia();

      const grid = document.getElementById('chooser-grid');
      expect(grid.innerHTML).toContain('cat-photo');
      expect(grid.innerHTML).toContain('dog-photo');
      expect(grid.innerHTML).toContain('bird-photo');
    });
  });

  describe('selectChooserImage', () => {
    beforeEach(async () => {
      const mockMedia = {
        resources: [{
          public_id: 'folder/test-image',
          secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/test-image.jpg',
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date().toISOString()
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMedia
      });

      await openImageChooser(mockCallback);
    });

    it('calls callback with extracted public_id', () => {
      const imageUrl = 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/folder/test-image.jpg';

      selectChooserImage(imageUrl);

      // Should extract public_id from Cloudinary URL
      expect(mockCallback).toHaveBeenCalledWith('folder/test-image');
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

  });


  describe('Pagination', () => {
    it('shows 12 items per page', async () => {
      const manyImages = {
        resources: Array.from({ length: 25 }, (_, i) => ({
          public_id: `image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date().toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyImages
      });

      await openImageChooser(mockCallback);

      const grid = document.getElementById('chooser-grid');
      expect(grid.children.length).toBe(12);
    });

    it('hides pagination when <= 12 items', async () => {
      const fewImages = {
        resources: Array.from({ length: 5 }, (_, i) => ({
          public_id: `image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date().toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => fewImages
      });

      await openImageChooser(mockCallback);

      const pagination = document.getElementById('chooser-pagination');
      expect(pagination?.classList.contains('d-none')).toBe(true);
    });

    it('shows pagination when > 12 items', async () => {
      const manyImages = {
        resources: Array.from({ length: 25 }, (_, i) => ({
          public_id: `image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date().toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyImages
      });

      await openImageChooser(mockCallback);

      const pagination = document.getElementById('chooser-pagination');
      expect(pagination?.classList.contains('d-none')).toBe(false);
    });

    it('calculates total pages correctly', async () => {
      const manyImages = {
        resources: Array.from({ length: 25 }, (_, i) => ({
          public_id: `image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date().toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyImages
      });

      await openImageChooser(mockCallback);

      const totalPages = document.getElementById('chooser-total-pages');
      // 25 images / 12 per page = 3 pages
      expect(totalPages?.textContent).toBe('3');
    });
  });

  describe('Integration - Complete Chooser Workflow', () => {
    it('can open, search, paginate, and select an image', async () => {
      const manyImages = {
        resources: Array.from({ length: 25 }, (_, i) => ({
          public_id: `test-image-${i}`,
          secure_url: `https://res.cloudinary.com/circleseven/image/upload/v1234567890/test-image-${i}.jpg`,
          resource_type: 'image',
          width: 800,
          height: 600,
          bytes: 102400,
          created_at: new Date(Date.now() - i * 1000).toISOString()
        }))
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => manyImages
      });

      // Open chooser
      await openImageChooser(mockCallback);
      let modal = document.getElementById('imageChooserModal');
      expect(modal.classList.contains('d-none')).toBe(false);

      // Verify first page shows 12 items
      let grid = document.getElementById('chooser-grid');
      expect(grid.children.length).toBe(12);

      // Search for specific images
      const searchInput = document.getElementById('chooser-search');
      searchInput.value = 'image-1';
      filterChooserMedia();
      grid = document.getElementById('chooser-grid');
      expect(grid.children.length).toBeLessThan(25); // Filtered results

      // Clear search and paginate
      searchInput.value = '';
      filterChooserMedia();
      changeChooserPage(1); // Go to page 2
      grid = document.getElementById('chooser-grid');
      expect(grid.children.length).toBe(12);

      // Select an image
      const imageUrl = 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/test-image-5.jpg';
      selectChooserImage(imageUrl);

      // Verify callback was called with public_id
      expect(mockCallback).toHaveBeenCalledWith('test-image-5');
    });
  });
});
