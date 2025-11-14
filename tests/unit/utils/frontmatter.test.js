/**
 * Unit Tests for Frontmatter Utility
 *
 * Tests YAML frontmatter parsing and building for Jekyll/markdown files.
 * Validates handling of strings, booleans, arrays, and edge cases.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation
const { parseFrontmatter, buildFrontmatter } = await import('../../../netlify/utils/frontmatter.cjs');

describe('Frontmatter Utility', () => {
  describe('parseFrontmatter()', () => {
    it('parses basic frontmatter with string values', () => {
      const content = `---
title: About Us
layout: page
permalink: /about/
---
Page content here`;

      const { frontmatter, body } = parseFrontmatter(content);

      expect(frontmatter.title).toBe('About Us');
      expect(frontmatter.layout).toBe('page');
      expect(frontmatter.permalink).toBe('/about/');
      expect(body).toBe('Page content here');
    });

    it('parses boolean values correctly', () => {
      const content = `---
title: Test
protected: true
published: false
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(frontmatter.protected).toBe(true);
      expect(frontmatter.published).toBe(false);
      expect(typeof frontmatter.protected).toBe('boolean');
      expect(typeof frontmatter.published).toBe('boolean');
    });

    it('parses YAML list syntax arrays', () => {
      const content = `---
title: Post
tags:
  - news
  - featured
  - tech
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(Array.isArray(frontmatter.tags)).toBe(true);
      expect(frontmatter.tags).toEqual(['news', 'featured', 'tech']);
    });

    it('parses inline array syntax', () => {
      const content = `---
title: Post
categories: [Tech, Life, Music]
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(Array.isArray(frontmatter.categories)).toBe(true);
      expect(frontmatter.categories).toEqual(['Tech', 'Life', 'Music']);
    });

    it('handles single-item YAML list as array', () => {
      const content = `---
title: Post
tags:
  - solo-tag
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(Array.isArray(frontmatter.tags)).toBe(true);
      expect(frontmatter.tags).toEqual(['solo-tag']);
    });

    it('handles single-value non-list as string', () => {
      const content = `---
title: Post
category: Tech
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(typeof frontmatter.category).toBe('string');
      expect(frontmatter.category).toBe('Tech');
    });

    it('handles quoted string values', () => {
      const content = `---
title: "Quoted Title"
description: 'Single quoted'
author: "O'Brien"
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(frontmatter.title).toBe('Quoted Title');
      expect(frontmatter.description).toBe('Single quoted');
      expect(frontmatter.author).toBe("O'Brien");
    });

    it('handles colons in values', () => {
      const content = `---
title: Post: A Deep Dive
time: 14:30:00
url: https://example.com
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(frontmatter.title).toBe('Post: A Deep Dive');
      expect(frontmatter.time).toBe('14:30:00');
      expect(frontmatter.url).toBe('https://example.com');
    });

    it('handles empty arrays in inline syntax', () => {
      const content = `---
title: Post
tags: []
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      // Empty inline array becomes array with empty string
      expect(Array.isArray(frontmatter.tags)).toBe(true);
      expect(frontmatter.tags).toEqual(['']);
    });

    it('handles content without frontmatter', () => {
      const content = 'Just plain content without frontmatter';

      const { frontmatter, body } = parseFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('handles empty frontmatter', () => {
      const content = `---
---
Content here`;

      const { frontmatter, body } = parseFrontmatter(content);

      expect(frontmatter).toEqual({});
      // Body includes the empty frontmatter delimiters when frontmatter is empty
      expect(body).toBe('---\n---\nContent here');
    });

    it('handles multiline content body', () => {
      const content = `---
title: Post
---
Line 1
Line 2

Paragraph break

Line 3`;

      const { body } = parseFrontmatter(content);

      expect(body).toBe(`Line 1
Line 2

Paragraph break

Line 3`);
    });

    it('handles arrays with quoted items', () => {
      const content = `---
title: Post
tags:
  - "tag with spaces"
  - 'another tag'
  - normal-tag
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(frontmatter.tags).toEqual(['tag with spaces', 'another tag', 'normal-tag']);
    });

    it('handles mixed types in frontmatter', () => {
      const content = `---
title: Complex Post
count: 42
active: true
tags:
  - tech
  - news
category: Music
---
Content`;

      const { frontmatter } = parseFrontmatter(content);

      expect(frontmatter.title).toBe('Complex Post');
      expect(frontmatter.count).toBe('42'); // Numbers become strings in simple parser
      expect(frontmatter.active).toBe(true);
      expect(frontmatter.tags).toEqual(['tech', 'news']);
      expect(frontmatter.category).toBe('Music');
    });

    it('trims body whitespace', () => {
      const content = `---
title: Post
---


Content with leading blank lines
`;

      const { body } = parseFrontmatter(content);

      expect(body).toBe('Content with leading blank lines');
    });
  });

  describe('buildFrontmatter()', () => {
    it('builds basic frontmatter with strings', () => {
      const frontmatter = {
        title: 'About Us',
        layout: 'page',
        permalink: '/about/'
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('---');
      expect(yaml).toContain('title: About Us');
      expect(yaml).toContain('layout: page');
      expect(yaml).toContain('permalink: /about/');
      expect(yaml.startsWith('---\n')).toBe(true);
      expect(yaml.endsWith('---\n')).toBe(true);
    });

    it('builds boolean values without quotes', () => {
      const frontmatter = {
        title: 'Test',
        protected: true,
        published: false
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('protected: true');
      expect(yaml).toContain('published: false');
      expect(yaml).not.toContain('"true"');
      expect(yaml).not.toContain('"false"');
    });

    it('builds arrays using YAML list syntax', () => {
      const frontmatter = {
        title: 'Post',
        tags: ['news', 'featured', 'tech']
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('tags:');
      expect(yaml).toContain('  - news');
      expect(yaml).toContain('  - featured');
      expect(yaml).toContain('  - tech');
    });

    it('builds empty arrays using inline syntax', () => {
      const frontmatter = {
        title: 'Post',
        tags: []
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('tags: []');
    });

    it('skips null values', () => {
      const frontmatter = {
        title: 'Post',
        category: null,
        tags: ['tech']
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('title: Post');
      expect(yaml).not.toContain('category');
      expect(yaml).toContain('tags:');
    });

    it('skips undefined values', () => {
      const frontmatter = {
        title: 'Post',
        category: undefined,
        tags: ['tech']
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('title: Post');
      expect(yaml).not.toContain('category');
      expect(yaml).toContain('tags:');
    });

    it('handles empty object', () => {
      const yaml = buildFrontmatter({});

      expect(yaml).toBe('---\n---\n');
    });

    it('handles mixed types correctly', () => {
      const frontmatter = {
        title: 'Complex Post',
        count: 42,
        active: true,
        tags: ['tech', 'news'],
        category: 'Music'
      };

      const yaml = buildFrontmatter(frontmatter);

      expect(yaml).toContain('title: Complex Post');
      expect(yaml).toContain('count: 42');
      expect(yaml).toContain('active: true');
      expect(yaml).toContain('tags:');
      expect(yaml).toContain('  - tech');
      expect(yaml).toContain('  - news');
      expect(yaml).toContain('category: Music');
    });
  });

  describe('Round-trip parsing and building', () => {
    it('maintains data integrity through parse and build cycle', () => {
      const original = `---
title: Test Post
layout: post
protected: true
tags:
  - tech
  - news
---
This is the content.`;

      const { frontmatter, body } = parseFrontmatter(original);
      const rebuilt = buildFrontmatter(frontmatter) + body;

      // Parse again to compare
      const { frontmatter: frontmatter2, body: body2 } = parseFrontmatter(rebuilt);

      expect(frontmatter2.title).toBe(frontmatter.title);
      expect(frontmatter2.layout).toBe(frontmatter.layout);
      expect(frontmatter2.protected).toBe(frontmatter.protected);
      expect(frontmatter2.tags).toEqual(frontmatter.tags);
      expect(body2).toBe(body);
    });

    it('preserves arrays through round-trip', () => {
      const frontmatter = {
        tags: ['one', 'two', 'three']
      };

      const yaml = buildFrontmatter(frontmatter);
      const content = yaml + 'Content';
      const { frontmatter: parsed } = parseFrontmatter(content);

      expect(parsed.tags).toEqual(['one', 'two', 'three']);
    });

    it('preserves booleans through round-trip', () => {
      const frontmatter = {
        published: true,
        draft: false
      };

      const yaml = buildFrontmatter(frontmatter);
      const content = yaml + 'Content';
      const { frontmatter: parsed } = parseFrontmatter(content);

      expect(parsed.published).toBe(true);
      expect(parsed.draft).toBe(false);
    });
  });
});
