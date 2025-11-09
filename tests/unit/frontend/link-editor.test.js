/**
 * Unit Tests for Link Editor Module
 *
 * Tests the link insertion/editing functionality for markdown editor,
 * focusing on core functions and public API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initLinkEditor, openLinkEditor, searchContent, submitLink, cancelLink } from '../../../admin/js/modules/link-editor.js';

describe('Link Editor Module', () => {
  let loggerMocks;
  let mockEditor;
  let mockCodeMirror;

  beforeEach(async () => {
    // Use fake timers to prevent setTimeout from running after test cleanup
    vi.useFakeTimers();
    // Create DOM elements required by the module
    document.body.innerHTML = `
      <div class="modal" id="linkEditorModal">
        <div class="modal-content">
          <h5 id="link-modal-title">Insert Link</h5>
          <input type="text" id="link-url" />
          <input type="text" id="link-text" />
          <input type="checkbox" id="link-new-tab" />
          <input type="text" id="link-search" />
          <div id="link-content-list"></div>
          <div id="link-search-info"></div>
          <button id="link-submit-btn">Insert Link</button>
        </div>
      </div>
    `;

    // Mock bootstrap Modal
    global.bootstrap = {
      Modal: class {
        constructor(element) {
          this.element = element;
        }
        show() {}
        hide() {}
        static getInstance(element) {
          return new this(element);
        }
      }
    };

    // Mock alert
    global.alert = vi.fn();

    // Mock window.allPostsWithMetadata and window.allPages
    global.window.allPostsWithMetadata = [
      {
        name: '2025-01-15-test-post.md',
        frontmatter: {
          title: 'Test Post',
          permalink: '/test-post/'
        },
        date: new Date('2025-01-15')
      },
      {
        name: '2025-01-10-old-post.md',
        frontmatter: {
          title: 'Old Post',
          permalink: '/old-post/'
        },
        date: new Date('2025-01-10')
      }
    ];

    global.window.allPages = [
      {
        name: 'about.md',
        frontmatter: {
          title: 'About',
          permalink: '/about/'
        }
      }
    ];

    // Mock CodeMirror
    mockCodeMirror = {
      getSelection: vi.fn(() => ''),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      getLine: vi.fn(() => ''),
      replaceSelection: vi.fn(),
      replaceRange: vi.fn(),
      focus: vi.fn()
    };

    // Mock EasyMDE editor
    mockEditor = {
      codemirror: mockCodeMirror
    };

    // Mock logger
    const loggerModule = await import('../../../admin/js/core/logger.js');
    loggerMocks = {
      log: vi.spyOn(loggerModule.default, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    delete global.bootstrap;
    delete global.alert;
    delete global.window.allPostsWithMetadata;
    delete global.window.allPages;
    delete global.window.allPagesWithMetadata;
    // Don't delete window.selectContent, submitLink, cancelLink - they're set at module load time
    document.body.innerHTML = '';
  });

  describe('initLinkEditor', () => {
    it('initializes without errors', () => {
      expect(() => initLinkEditor()).not.toThrow();
    });

    it('logs content items populated', () => {
      initLinkEditor();
      expect(loggerMocks.log).toHaveBeenCalledWith(
        'Link editor content items populated:',
        expect.any(Number)
      );
    });

    it('populates content items from posts and pages', () => {
      initLinkEditor();

      // Should have logged that items were populated
      expect(loggerMocks.log).toHaveBeenCalled();
      const callArgs = loggerMocks.log.mock.calls[0];
      expect(callArgs[1]).toBe(3); // 2 posts + 1 page
    });
  });

  describe('openLinkEditor', () => {
    beforeEach(() => {
      initLinkEditor();
    });

    it('opens modal for new link', () => {
      mockCodeMirror.getSelection.mockReturnValue('selected text');
      mockCodeMirror.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockCodeMirror.getLine.mockReturnValue('plain text');

      openLinkEditor(mockEditor);

      expect(document.getElementById('link-modal-title').textContent).toBe('Insert Link');
      expect(document.getElementById('link-submit-btn').textContent).toBe('Insert Link');
      expect(document.getElementById('link-text').value).toBe('selected text');
    });

    it('sets default values for new link', () => {
      mockCodeMirror.getSelection.mockReturnValue('');
      mockCodeMirror.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockCodeMirror.getLine.mockReturnValue('');

      openLinkEditor(mockEditor);

      expect(document.getElementById('link-url').value).toBe('');
      expect(document.getElementById('link-new-tab').checked).toBe(true);
    });

    it('detects existing markdown link', () => {
      const linkText = '[Example](https://example.com)';
      mockCodeMirror.getSelection.mockReturnValue('');
      mockCodeMirror.getCursor.mockReturnValue({ line: 0, ch: 5 }); // Within link
      mockCodeMirror.getLine.mockReturnValue(linkText);

      openLinkEditor(mockEditor);

      expect(document.getElementById('link-modal-title').textContent).toBe('Edit Link');
      expect(document.getElementById('link-submit-btn').textContent).toBe('Update');
      expect(document.getElementById('link-url').value).toBe('https://example.com');
      expect(document.getElementById('link-text').value).toBe('Example');
    });

    it('detects existing markdown link with new tab', () => {
      const linkText = '[Example](https://example.com){:target="_blank"}';
      mockCodeMirror.getCursor.mockReturnValue({ line: 0, ch: 5 });
      mockCodeMirror.getLine.mockReturnValue(linkText);

      openLinkEditor(mockEditor);

      expect(document.getElementById('link-url').value).toBe('https://example.com');
      expect(document.getElementById('link-text').value).toBe('Example');
      expect(document.getElementById('link-new-tab').checked).toBe(true);
    });

    it('refreshes content items when opening', () => {
      loggerMocks.log.mockClear();

      openLinkEditor(mockEditor);

      expect(loggerMocks.log).toHaveBeenCalledWith(
        'Link editor content items populated:',
        expect.any(Number)
      );
    });
  });

  describe('searchContent', () => {
    beforeEach(() => {
      initLinkEditor();
    });

    it('searches content by title', () => {
      document.getElementById('link-search').value = 'Test';

      searchContent();

      const listHTML = document.getElementById('link-content-list').innerHTML;
      expect(listHTML).toContain('Test Post');
      expect(listHTML).not.toContain('Old Post');
    });

    it('searches content by URL', () => {
      document.getElementById('link-search').value = 'about';

      searchContent();

      const listHTML = document.getElementById('link-content-list').innerHTML;
      expect(listHTML).toContain('About');
    });

    it('shows count of found items', () => {
      document.getElementById('link-search').value = 'post';

      searchContent();

      const info = document.getElementById('link-search-info').textContent;
      expect(info).toContain('Found 2 items');
    });

    it('shows "No items found" for no matches', () => {
      document.getElementById('link-search').value = 'nonexistent';

      searchContent();

      const info = document.getElementById('link-search-info').textContent;
      expect(info).toContain('No items found');
    });

    it('shows recent items when no search term', () => {
      document.getElementById('link-search').value = '';

      searchContent();

      const info = document.getElementById('link-search-info').textContent;
      expect(info).toContain('Showing recent items');
    });
  });

  describe('submitLink', () => {
    beforeEach(() => {
      initLinkEditor();
      mockCodeMirror.getSelection.mockReturnValue('');
      mockCodeMirror.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockCodeMirror.getLine.mockReturnValue('');
      openLinkEditor(mockEditor);
    });

    it('inserts link with markdown format', () => {
      document.getElementById('link-url').value = 'https://example.com';
      document.getElementById('link-text').value = 'Example';
      document.getElementById('link-new-tab').checked = false;

      submitLink();

      expect(mockCodeMirror.replaceSelection).toHaveBeenCalledWith(
        '[Example](https://example.com)'
      );
    });

    it('inserts link with new tab target', () => {
      document.getElementById('link-url').value = 'https://example.com';
      document.getElementById('link-text').value = 'Example';
      document.getElementById('link-new-tab').checked = true;

      submitLink();

      expect(mockCodeMirror.replaceSelection).toHaveBeenCalledWith(
        '[Example](https://example.com){:target="_blank"}'
      );
    });

    it('validates URL is required', () => {
      document.getElementById('link-url').value = '';
      document.getElementById('link-text').value = 'Example';

      submitLink();

      expect(global.alert).toHaveBeenCalledWith('Please enter a URL');
      expect(mockCodeMirror.replaceSelection).not.toHaveBeenCalled();
    });

    it('validates link text is required', () => {
      document.getElementById('link-url').value = 'https://example.com';
      document.getElementById('link-text').value = '';

      submitLink();

      expect(global.alert).toHaveBeenCalledWith('Please enter link text');
      expect(mockCodeMirror.replaceSelection).not.toHaveBeenCalled();
    });

    it('trims whitespace from inputs', () => {
      document.getElementById('link-url').value = '  https://example.com  ';
      document.getElementById('link-text').value = '  Example  ';
      document.getElementById('link-new-tab').checked = false;

      submitLink();

      expect(mockCodeMirror.replaceSelection).toHaveBeenCalledWith(
        '[Example](https://example.com)'
      );
    });

    it('focuses editor after inserting link', () => {
      document.getElementById('link-url').value = 'https://example.com';
      document.getElementById('link-text').value = 'Example';

      submitLink();

      expect(mockCodeMirror.focus).toHaveBeenCalled();
    });
  });

  describe('selectContent', () => {
    beforeEach(() => {
      initLinkEditor();
      openLinkEditor(mockEditor);
    });

    it('exposes selectContent on window', () => {
      expect(typeof window.selectContent).toBe('function');
    });

    it('sets URL and text when content is selected', () => {
      window.selectContent('/test-post/', 'Test Post');

      expect(document.getElementById('link-url').value).toBe('/test-post/');
      expect(document.getElementById('link-text').value).toBe('Test Post');
    });

    it('unchecks new tab for internal links', () => {
      document.getElementById('link-new-tab').checked = true;

      window.selectContent('/about/', 'About');

      expect(document.getElementById('link-new-tab').checked).toBe(false);
    });
  });

  describe('Window Exports', () => {
    it('exposes submitLink on window', () => {
      expect(typeof window.submitLink).toBe('function');
    });

    it('exposes cancelLink on window', () => {
      expect(typeof window.cancelLink).toBe('function');
    });

    it('exposes selectContent on window', () => {
      initLinkEditor();
      openLinkEditor(mockEditor);
      expect(typeof window.selectContent).toBe('function');
    });
  });

  describe('Content Item Population', () => {
    it('handles missing posts gracefully', () => {
      delete global.window.allPostsWithMetadata;

      expect(() => initLinkEditor()).not.toThrow();
    });

    it('handles missing pages gracefully', () => {
      delete global.window.allPages;

      expect(() => initLinkEditor()).not.toThrow();
    });

    it('uses allPagesWithMetadata when available', () => {
      global.window.allPagesWithMetadata = [
        {
          name: 'contact.md',
          frontmatter: {
            title: 'Contact',
            permalink: '/contact/'
          }
        }
      ];

      initLinkEditor();

      const callArgs = loggerMocks.log.mock.calls[0];
      expect(callArgs[1]).toBe(3); // 2 posts + 1 page from allPagesWithMetadata
    });

    it('sorts content by date (most recent first)', () => {
      global.window.allPostsWithMetadata = [
        {
          name: 'old.md',
          frontmatter: { title: 'Old', permalink: '/old/' },
          date: new Date('2020-01-01')
        },
        {
          name: 'new.md',
          frontmatter: { title: 'New', permalink: '/new/' },
          date: new Date('2025-01-01')
        }
      ];

      initLinkEditor();
      document.getElementById('link-search').value = '';
      searchContent();

      const listHTML = document.getElementById('link-content-list').innerHTML;
      const newIndex = listHTML.indexOf('New');
      const oldIndex = listHTML.indexOf('Old');
      expect(newIndex).toBeLessThan(oldIndex);
    });
  });
});
