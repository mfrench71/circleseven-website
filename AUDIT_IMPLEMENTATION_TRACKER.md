# 🔧 Circle Seven Website - Audit Implementation Tracker

**Generated**: 2025-11-21
**Status**: Ready to Begin
**Overall Progress**: 0% (0/118 hours completed)

---

## 📊 Quick Reference

### Current Phase
**Phase 1: Quick Wins** (0% complete)

### Priority Issues
1. ❌ Inline CSS in comments.html (CRITICAL - violates project guidelines)
2. ❌ Missing Open Graph meta tags (CRITICAL - SEO/social sharing)
3. ❌ Color contrast failures (CRITICAL - accessibility)
4. ❌ Font Awesome bloat (HIGH - performance)

### Next Actions
1. Move comments.html inline CSS to external file
2. Add Open Graph meta tags to head.html
3. Fix color contrast in cards.css
4. Replace Font Awesome with inline SVG icons

---

## 🎯 Phase 1: Quick Wins (22 hours)

**Target Completion**: Week 1-2
**Progress**: 0/22 hours (0%)

### Week 1: SEO & Accessibility (10.5 hours)

#### 1. Add Open Graph Meta Tags (2 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `_includes/head.html`
- [ ] **Changes needed**:
  - [ ] Add Open Graph image tags for social sharing
  - [ ] Add Twitter Card tags
  - [ ] Add og:type, og:title, og:description
  - [ ] Test with Facebook Sharing Debugger
  - [ ] Test with Twitter Card Validator
- [ ] **Testing required**: Yes - Manual testing with social platforms
- [ ] **Tests to write**: None (visual verification)
- [ ] **Commit message**: "feat(seo): add Open Graph and Twitter Card meta tags for social sharing"

**Implementation Notes**:
```liquid
Location: _includes/head.html (after line 5)

{%- if page.featured_image or page.image -%}
{%- assign og_image = page.featured_image | default: page.image -%}
<meta property="og:image" content="{{ og_image | absolute_url }}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{{ og_image | absolute_url }}" />
{%- endif -%}
<meta property="og:type" content="{% if page.layout == 'post' %}article{% else %}website{% endif %}" />
<meta property="og:title" content="{{ page.title | default: site.title | escape }}" />
<meta property="og:description" content="{{ page.description | default: page.excerpt | default: site.description | strip_html | strip_newlines | truncate: 160 | escape }}" />
<meta property="og:url" content="{{ page.url | absolute_url }}" />
<meta property="og:site_name" content="{{ site.title }}" />
```

**Validation URLs**:
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

---

#### 2. Fix Color Contrast Issues (2 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `assets/css/cards.css`, potentially others
- [ ] **Changes needed**:
  - [ ] Change `.post-card-excerpt` from #666 to #555 (line 215)
  - [ ] Change `.post-date-reading` from #888 to #666 (line 258)
  - [ ] Run full contrast audit with WebAIM
  - [ ] Check `.no-comments` in comments.css
  - [ ] Check footer text colors
  - [ ] Check any gray text throughout site
- [ ] **Testing required**: Yes - Contrast ratio testing
- [ ] **Tests to write**: None (use tools)
- [ ] **Commit message**: "fix(a11y): improve color contrast ratios to meet WCAG AA standards"

**Tools to use**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools Lighthouse
- axe DevTools browser extension

**Colors to audit**:
```css
Current → Recommended (ratio)
#666 → #555 (5.74:1 → 7.48:1)
#888 → #666 (2.85:1 → 5.74:1)
```

---

#### 3. Add Focus Indicators (2 hours) ✅
- [x] **Status**: ✅ COMPLETED
- [x] **Files modified**: `assets/css/layout.css`, `_includes/skip-to-content.html`, `_includes/header.html`
- [x] **Changes implemented**:
  - [x] Added comprehensive focus styles for all interactive elements
  - [x] Added focus-visible selectors for modern browser support
  - [x] Added focus-within for cards
  - [x] Moved skip-to-content inline CSS to external stylesheet (per CLAUDE.md)
  - [x] Fixed duplicate skip-to-content link
  - [x] Added high contrast mode support
  - [x] Added reduced motion support
  - [x] Tested keyboard navigation
- [x] **Testing completed**: Manual keyboard testing, all tests passing (npm test)
- [x] **Commit**: Ready to commit
- [x] **Commit message**: "feat(a11y): add comprehensive keyboard focus indicators for WCAG compliance"

**Implementation**:
```css
/* New file: assets/css/accessibility.css or add to layout.css */

/* Focus indicators for all interactive elements */
a:focus,
button:focus,
input:focus,
textarea:focus,
select:focus {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove default outline but keep indicator */
a:focus-visible,
button:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* Card focus for keyboard navigation */
.post-card:focus-within {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(32, 178, 170, 0.1);
}

/* Skip to content link */
.skip-to-content:focus {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
}
```

**Keyboard testing checklist**:
- [ ] Tab through navigation
- [ ] Tab through post cards
- [ ] Tab through form fields
- [ ] Test skip-to-content link
- [ ] Test mobile menu with keyboard

---

#### 4. Create robots.txt (30 minutes)
- [ ] **Status**: Not Started
- [ ] **Files to create**: `robots.txt` in root directory
- [ ] **Changes needed**:
  - [ ] Block /admin/ and /admin-custom/
  - [ ] Block /.netlify/
  - [ ] Add sitemap reference
  - [ ] Test with Google Search Console
- [ ] **Testing required**: Yes - Validate robots.txt
- [ ] **Tests to write**: None
- [ ] **Commit message**: "feat(seo): add robots.txt to control crawler access"

**File content**:
```txt
# robots.txt for circleseven.co.uk
User-agent: *
Disallow: /admin/
Disallow: /admin-custom/
Disallow: /.netlify/
Disallow: /node_modules/
Disallow: /_site/
Allow: /

Sitemap: https://circleseven.co.uk/sitemap.xml
```

**Validation**:
- Google Search Console: https://search.google.com/search-console/robots-testing-tool
- robots.txt Tester: https://en.ryte.com/free-tools/robots-txt/

---

#### 5. Add Pagination SEO Links (1 hour) ✅
- [x] **Status**: ✅ COMPLETED
- [x] **Files modified**: `_includes/head.html`
- [x] **Changes implemented**:
  - [x] Added rel="prev" link tag for previous pages
  - [x] Added rel="next" link tag for next pages
  - [x] Tested on pages 1, 2, and 3
- [x] **Testing completed**: Manual verification on paginated pages
- [x] **Commit**: Ready to commit
- [x] **Commit message**: "feat(seo): add rel=prev/next links for paginated pages"

**Implementation**:
```liquid
{%- if paginator.previous_page -%}
<link rel="prev" href="{{ paginator.previous_page_path | absolute_url }}" />
{%- endif -%}
{%- if paginator.next_page -%}
<link rel="next" href="{{ paginator.next_page_path | absolute_url }}" />
{%- endif -%}
```

**Where to add**: In `<head>` section of layout that uses pagination

---

#### 6. Enhance JSON-LD Schema (1 hour)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `_includes/structured-data.html`
- [ ] **Changes needed**:
  - [ ] Add proper dateModified (currently uses fallback)
  - [ ] Add isPartOf for blog structure
  - [ ] Add articleSection
  - [ ] Test with Google Rich Results Test
- [ ] **Testing required**: Yes - Rich results validation
- [ ] **Tests to write**: None
- [ ] **Commit message**: "feat(seo): enhance JSON-LD structured data with additional schema properties"

**Changes to make**:
```json
Line 9: Add after datePublished
"dateModified": "{{ page.last_modified_at | default: page.date | date_to_xmlschema }}",

After line 43:
"isPartOf": {
  "@type": "Blog",
  "name": "{{ site.title }}",
  "url": "{{ site.url }}{{ site.baseurl }}"
},

Line 51: Already has articleSection ✓
```

**Validation**:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/

---

#### 7. Audit and Fix Image Alt Text (2 hours) ✅
- [x] **Status**: ✅ COMPLETED
- [x] **Files scanned**: All `_includes/*.html`, `_layouts/*.html`, and 36 blog posts
- [x] **Changes implemented**:
  - [x] Audited all templates (found well-structured with proper alt text)
  - [x] Fixed 200+ images with empty alt="" that lacked figcaptions
  - [x] Verified images with figcaptions correctly retain alt=""
  - [x] Added descriptive alt text based on context and filenames
- [x] **Testing completed**: All tests passing (npm test)
- [x] **Commit**: `5e6596a fix(a11y): add descriptive alt text to images across 36 blog posts`

**Templates checked (all good)**:
- [x] `_includes/comments.html` - ✓ Uses commenter's name
- [x] `_layouts/post.html` - ✓ Uses author name
- [x] `_includes/header.html` - ✓ "Profile" (appropriate for logo)
- [x] `_includes/post-card-image.html` - ✓ Uses post title
- [x] `_includes/featured-image.html` - ✓ Uses page title
- [x] `_includes/cloudinary-image.html` - ✓ Requires alt parameter

**Posts fixed (36 files, 200+ images)**:
- Plymouth Bomb Sight app screenshots
- Drama Queen photomontage
- Disinformation project X-rays
- Boathouse archive photos
- Corporate identity designs
- Various DAT module assignment images

**Alt text guidelines followed**:
- Images with figcaptions: `alt=""` (caption provides description)
- Images without figcaptions: Descriptive alt text added
- Descriptions based on filename, surrounding context, post title

---

### Week 2: Code Quality (11.5 hours)

#### 8. Move Inline CSS to External Files (3 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**:
  - [ ] `_includes/comments.html` (remove lines 85-235)
  - [ ] Create `assets/css/comments.css`
  - [ ] Update `build-css.cjs` to include comments.css
  - [ ] `_layouts/post.html` (remove inline style attributes)
  - [ ] Update `assets/css/edit-links.css`
- [ ] **Changes needed**:
  - [ ] Extract 150 lines of CSS from comments.html
  - [ ] Create new CSS file
  - [ ] Add to CSS build pipeline
  - [ ] Replace inline styles with classes
  - [ ] Test comments section styling
- [ ] **Testing required**: Yes - Visual regression testing
- [ ] **Tests to write**: E2E test for comments form
- [ ] **Commit message**: "refactor(css): move inline CSS to external stylesheets per project guidelines"

**Steps**:
1. Create `assets/css/comments.css` with content from lines 85-235 of comments.html
2. Update `build-css.cjs` line that lists CSS files to include:
   ```javascript
   'assets/css/comments.css',
   ```
3. Remove `<style>` tag from `_includes/comments.html`
4. Test build: `npm run build:css`
5. Verify comments styling on a post page

**Edit links fix**:
```css
/* assets/css/edit-links.css - add: */
.edit-post-link,
.edit-card-link {
  display: none;
}

body.logged-in .edit-post-link,
body.logged-in .edit-card-link {
  display: inline-block;
}
```

Then update `assets/js/edit-links.js` to add class to body:
```javascript
if (currentUser) {
  document.body.classList.add('logged-in');
}
```

---

#### 9. Centralize Deployment Tracking (4 hours)
- [ ] **Status**: Not Started
- [ ] **Files to create**: `admin/js/modules/deployment-tracker.js`
- [ ] **Files to modify**:
  - [ ] `admin/js/modules/posts.js`
  - [ ] `admin/js/modules/pages.js`
  - [ ] `admin/js/modules/settings.js`
  - [ ] `admin/js/modules/taxonomy.js`
- [ ] **Changes needed**:
  - [ ] Create centralized deployment tracking module
  - [ ] Export trackDeployment, showBanner, startPolling functions
  - [ ] Update all modules to import from deployment-tracker
  - [ ] Remove duplicate implementations
  - [ ] Test deployment tracking from each module
- [ ] **Testing required**: Yes - Unit tests + E2E tests
- [ ] **Tests to write**:
  - [ ] Unit test: deployment-tracker.test.js
  - [ ] Update existing tests that mock deployments
- [ ] **Commit message**: "refactor(admin): centralize deployment tracking logic to eliminate duplication"

**New file structure**:
```javascript
// admin/js/modules/deployment-tracker.js

/**
 * Centralized deployment tracking for all admin modules
 * Manages GitHub Actions deployment status and live banners
 */

let activeDeployment = null;
let pollingInterval = null;
const POLL_INTERVAL = 10000; // 10 seconds

/**
 * Track a new deployment
 * @param {string} commitSha - GitHub commit SHA
 * @param {string} action - Action description (e.g., "Updated post")
 * @param {string} itemId - Item identifier
 */
export async function trackDeployment(commitSha, action, itemId) {
  activeDeployment = {
    commitSha,
    action,
    itemId,
    startTime: Date.now()
  };

  // Persist to localStorage
  localStorage.setItem('active_deployment', JSON.stringify(activeDeployment));

  // Show banner
  showDeploymentBanner(action);

  // Start polling
  startPolling();
}

/**
 * Show deployment status banner
 * @param {string} action - Action description
 */
export function showDeploymentBanner(action) {
  // Implementation here...
}

/**
 * Start polling GitHub Actions API
 */
export function startPolling() {
  // Implementation here...
}

/**
 * Stop tracking and clear banner
 */
export function stopTracking() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  activeDeployment = null;
  localStorage.removeItem('active_deployment');
  hideBanner();
}

/**
 * Hide deployment banner
 */
function hideBanner() {
  // Implementation here...
}

/**
 * Check if there's an active deployment
 * @returns {boolean}
 */
export function hasActiveDeployment() {
  return activeDeployment !== null;
}

/**
 * Get active deployment info
 * @returns {object|null}
 */
export function getActiveDeployment() {
  return activeDeployment;
}
```

**Update posts.js, pages.js, settings.js**:
```javascript
// Replace existing trackDeployment with:
import { trackDeployment } from './deployment-tracker.js';

// Then use it:
await trackDeployment(result.sha, 'Updated post', fileName);
```

**Testing checklist**:
- [ ] Test from posts edit page
- [ ] Test from pages edit page
- [ ] Test from settings page
- [ ] Test from taxonomy page
- [ ] Test banner appears
- [ ] Test polling works
- [ ] Test success/failure states
- [ ] Test localStorage persistence

---

#### 10. Reduce Font Awesome Bloat (2 hours)
- [ ] **Status**: Not Started
- [ ] **Files to audit**: All files using Font Awesome icons
- [ ] **Changes needed**:
  - [ ] List all Font Awesome icons used
  - [ ] Create SVG sprite or individual SVG files
  - [ ] Create `_includes/icons/` directory
  - [ ] Replace `<i class="fas fa-*">` with SVG includes
  - [ ] Remove Font Awesome CSS link
  - [ ] Test all icons render correctly
- [ ] **Testing required**: Yes - Visual verification on all pages
- [ ] **Tests to write**: None (visual verification)
- [ ] **Commit message**: "perf(assets): replace Font Awesome with inline SVG icons (-83% size)"

**Step 1: Audit icon usage**
```bash
# Find all Font Awesome icon classes
grep -r "fa-" _includes/ _layouts/ admin/ --include="*.html" | grep -o "fa-[a-z-]*" | sort -u
```

**Expected icons** (from audit):
- `fa-edit` - Edit buttons
- `fa-graduation-cap` - Year 1 modules
- `fa-laptop-code` - Year 2 modules
- `fa-rocket` - Year 3 modules
- `fa-folder-open` - Project categories
- `fa-calendar` - Post dates
- `fa-clock` - Reading time
- (possibly 5-10 more)

**Step 2: Create SVG sprite**
Create `_includes/icons/sprite.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="icon-edit" viewBox="0 0 512 512">
    <!-- Font Awesome edit icon path -->
    <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 14.3-32 0-32H96z"/>
  </symbol>

  <symbol id="icon-calendar" viewBox="0 0 448 512">
    <!-- Font Awesome calendar icon path -->
  </symbol>

  <!-- Add more icons... -->
</svg>
```

**Step 3: Create icon include**
Create `_includes/icon.html`:
```liquid
{%- assign icon = include.name -%}
{%- assign size = include.size | default: 16 -%}
{%- assign class = include.class | default: "" -%}

<svg class="icon icon-{{ icon }} {{ class }}" width="{{ size }}" height="{{ size }}" aria-hidden="true">
  <use href="#icon-{{ icon }}"></use>
</svg>
```

**Step 4: Replace Font Awesome usage**
```liquid
<!-- Old: -->
<i class="fas fa-edit" aria-hidden="true"></i>

<!-- New: -->
{%- include icon.html name="edit" size="16" -%}
```

**Step 5: Remove Font Awesome**
Remove from `_includes/head.html` line 71:
```html
<!-- DELETE THIS LINE: -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" ... />
```

**Size savings**:
- Before: ~300KB (Font Awesome CSS + fonts)
- After: ~5KB (inline SVG sprite)
- **Savings: ~295KB (-98%)**

---

#### 11. Optimize Preconnect Hints (1 hour)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `_includes/head.html`
- [ ] **Changes needed**:
  - [ ] Remove redundant dns-prefetch for preconnected domains
  - [ ] Limit preconnect to 3-4 critical domains
  - [ ] Keep dns-prefetch for conditional resources
  - [ ] Reorder by priority
- [ ] **Testing required**: Yes - WebPageTest performance test
- [ ] **Tests to write**: None
- [ ] **Commit message**: "perf(preload): optimize resource hints to prioritize critical domains"

**Current state (head.html lines 14-28)**: 8 preconnects + 5 dns-prefetch (redundant)

**Optimized version**:
```html
<!-- Preconnect only to critical, always-used domains -->
<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>

<!-- DNS prefetch for conditional/later resources -->
<link rel="dns-prefetch" href="https://unpkg.com">
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
<link rel="dns-prefetch" href="https://www.gravatar.com">

<!-- Google Fonts - only if enabled -->
{% if site.google_fonts.enabled %}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{% endif %}
```

**Why these changes**:
- **Cloudinary**: Always used for images
- **cdnjs**: Always used for Font Awesome (until we remove it)
- **unpkg/jsdelivr**: Conditional (Leaflet, GLightbox) → dns-prefetch only
- **Gravatar**: Only on posts with comments → dns-prefetch only

**Testing**:
- Run WebPageTest before/after: https://www.webpagetest.org/
- Check connection timing in Chrome DevTools Network tab
- Verify no regression in LCP/FCP

---

#### 12. Add Form Accessibility Improvements (3 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `_includes/comments.html` (JavaScript section)
- [ ] **Changes needed**:
  - [ ] Add aria-invalid on validation errors
  - [ ] Add aria-describedby for error messages
  - [ ] Add aria-live for status updates
  - [ ] Update mobile menu ARIA in header.html
  - [ ] Add aria-controls to menu toggle
  - [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] **Testing required**: Yes - Screen reader testing
- [ ] **Tests to write**: E2E test for form validation
- [ ] **Commit message**: "feat(a11y): enhance form accessibility with ARIA attributes"

**Comments form improvements**:
```javascript
// In _includes/comments.html <script> section

// Add error handling
function showFieldError(field, message) {
  const errorId = field.id + '-error';

  // Create error message if doesn't exist
  let errorEl = document.getElementById(errorId);
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.id = errorId;
    errorEl.className = 'field-error';
    errorEl.setAttribute('role', 'alert');
    field.parentElement.appendChild(errorEl);
  }

  errorEl.textContent = message;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', errorId);
}

function clearFieldError(field) {
  const errorId = field.id + '-error';
  const errorEl = document.getElementById(errorId);

  if (errorEl) {
    errorEl.remove();
  }

  field.setAttribute('aria-invalid', 'false');
  field.removeAttribute('aria-describedby');
}

// Make status element a live region
statusEl.setAttribute('role', 'status');
statusEl.setAttribute('aria-live', 'polite');
statusEl.setAttribute('aria-atomic', 'true');

// Form validation
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  // Clear previous errors
  const fields = form.querySelectorAll('input, textarea');
  fields.forEach(clearFieldError);

  // Validate
  let valid = true;
  const name = formData.get('name');
  if (!name || name.length < 2) {
    showFieldError(document.getElementById('comment-name'), 'Name must be at least 2 characters');
    valid = false;
  }

  // ... more validation

  if (!valid) return;

  // ... rest of submission
});
```

**CSS for error messages**:
```css
/* Add to comments.css */
.field-error {
  display: block;
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.comment-form input[aria-invalid="true"],
.comment-form textarea[aria-invalid="true"] {
  border-color: #e74c3c;
  background-color: #fff5f5;
}
```

**Mobile menu ARIA (header.html)**:
```html
<!-- Line 143 - Update button -->
<button
  class="mobile-menu-toggle"
  aria-label="Toggle mobile menu"
  aria-expanded="false"
  aria-controls="mobile-drawer">
  <span class="hamburger" aria-hidden="true"></span>
</button>

<!-- Line 154 - Update drawer -->
<div class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
```

**Update menu.js**:
```javascript
// Toggle ARIA states
toggleBtn.setAttribute('aria-expanded', isOpen);
drawer.setAttribute('aria-hidden', !isOpen);

// Trap focus in drawer when open
if (isOpen) {
  drawer.querySelector('a, button, input').focus();
}
```

**Screen reader testing checklist**:
- [ ] Form labels announced correctly
- [ ] Error messages read aloud
- [ ] Success message read aloud
- [ ] Required fields announced
- [ ] Mobile menu state announced
- [ ] Skip-to-content link works

---

## 🎯 Phase 2: Feature Additions (42 hours)

**Target Completion**: Week 3-4
**Progress**: 0/42 hours (0%)

### Week 3: Frontend Polish (18 hours)

#### 13. Dark Mode Toggle (4 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**:
  - [ ] `assets/css/variables.css` (add dark mode colors)
  - [ ] `_includes/header.html` (add toggle button)
  - [ ] Create `assets/js/dark-mode.js`
  - [ ] Update CSS build to include dark mode styles
- [ ] **Changes needed**:
  - [ ] Define dark mode color palette
  - [ ] Create toggle button with icon
  - [ ] Implement localStorage persistence
  - [ ] Add smooth transition
  - [ ] Test all pages in dark mode
- [ ] **Testing required**: Yes - Visual test on all page types
- [ ] **Tests to write**: Unit test for dark mode toggle logic
- [ ] **Commit message**: "feat(ui): add dark mode toggle with localStorage persistence"

**Implementation notes**:
```css
/* variables.css - add dark mode colors */
:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --color-text-secondary: #666666;
  --color-border: #e8e8e8;
  --color-card-bg: #ffffff;
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-border: #333333;
  --color-card-bg: #2a2a2a;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 0.3s, color 0.3s;
}
```

---

#### 14. Social Sharing Buttons (2 hours)
- [ ] **Status**: Not Started
- [ ] **Files to create**: `_includes/social-share.html`
- [ ] **Files to modify**: `_layouts/post.html`
- [ ] **Changes needed**:
  - [ ] Create share buttons (Twitter, LinkedIn, Facebook)
  - [ ] Add "Copy link" button
  - [ ] Style buttons
  - [ ] Add share counts (optional)
  - [ ] Respect privacy (no tracking pixels)
- [ ] **Testing required**: Yes - Test sharing on each platform
- [ ] **Tests to write**: None
- [ ] **Commit message**: "feat(social): add privacy-respecting social sharing buttons"

---

#### 15. Enhanced Search (4 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `_pages/search.md`, create `assets/js/search.js`
- [ ] **Changes needed**:
  - [ ] Add search-as-you-type
  - [ ] Highlight matches in results
  - [ ] Add category/tag filters
  - [ ] Improve result relevance
  - [ ] Add keyboard navigation (arrow keys)
- [ ] **Testing required**: Yes - Test search functionality
- [ ] **Tests to write**: E2E test for search
- [ ] **Commit message**: "feat(search): enhance search with instant results and filters"

---

#### 16. Post Reactions (6 hours)
- [ ] **Status**: Not Started
- [ ] **Files to create**:
  - [ ] `netlify/functions/reactions-api.mjs`
  - [ ] `netlify/functions/reactions-add.mjs`
  - [ ] `assets/js/reactions.js`
  - [ ] `_includes/reactions.html`
- [ ] **Changes needed**:
  - [ ] Create Netlify functions for reactions
  - [ ] Store reactions in Netlify Blobs
  - [ ] Add reaction buttons (👍 ❤️ 🎉)
  - [ ] Show reaction counts
  - [ ] Prevent duplicate reactions (localStorage)
  - [ ] Animate reactions
- [ ] **Testing required**: Yes - Unit tests + E2E tests
- [ ] **Tests to write**:
  - [ ] Unit: reactions-api.test.js
  - [ ] Unit: reactions-add.test.js
  - [ ] E2E: Post reactions flow
- [ ] **Commit message**: "feat(engagement): add post reactions with Netlify Blobs storage"

---

#### 17. RSS by Category (2 hours)
- [ ] **Status**: Not Started
- [ ] **Files to create**: `feed-category.xml` (template)
- [ ] **Changes needed**:
  - [ ] Create category-specific RSS feeds
  - [ ] Add feed links to category pages
  - [ ] Update sitemap to include feeds
  - [ ] Add feed discovery meta tags
- [ ] **Testing required**: Yes - Validate feeds
- [ ] **Tests to write**: None
- [ ] **Commit message**: "feat(rss): add per-category RSS feeds for targeted subscriptions"

---

### Week 4: Admin Enhancements (24 hours)

#### 18. Draft Posts System (6 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**:
  - [ ] `admin/js/modules/posts.js`
  - [ ] `netlify/functions/posts.mjs`
  - [ ] Admin posts list page
- [ ] **Changes needed**:
  - [ ] Add "Save as Draft" button
  - [ ] Store drafts in `_drafts/` folder
  - [ ] Add draft status badge
  - [ ] Filter drafts in posts list
  - [ ] Preview draft before publishing
  - [ ] Move draft to `_posts/` on publish
- [ ] **Testing required**: Yes - Unit + E2E tests
- [ ] **Tests to write**:
  - [ ] Unit: posts.test.js - draft operations
  - [ ] Backend: posts.test.js - draft endpoints
  - [ ] E2E: Create and publish draft
- [ ] **Commit message**: "feat(admin): add draft posts system for unpublished content"

---

#### 19. Post Scheduling (8 hours)
- [ ] **Status**: Not Started
- [ ] **Files to create**:
  - [ ] `.github/workflows/scheduled-publish.yml`
  - [ ] `scripts/publish-scheduled-posts.js`
- [ ] **Files to modify**:
  - [ ] `admin/js/modules/posts.js` (add schedule UI)
  - [ ] Post front matter (add `scheduled_date`)
- [ ] **Changes needed**:
  - [ ] Add date picker for schedule date
  - [ ] Store scheduled date in front matter
  - [ ] Create GitHub Action for hourly checks
  - [ ] Script to move scheduled posts to `_posts/`
  - [ ] Status badge: "Scheduled for [date]"
  - [ ] Notification when post goes live
- [ ] **Testing required**: Yes - Test scheduling workflow
- [ ] **Tests to write**:
  - [ ] Unit: publish-scheduled-posts.test.js
  - [ ] E2E: Schedule post
- [ ] **Commit message**: "feat(admin): add post scheduling with GitHub Actions"

---

#### 20. SEO Checklist (6 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `admin/js/modules/posts.js`, `admin/js/modules/pages.js`
- [ ] **Changes needed**:
  - [ ] Add SEO checklist panel
  - [ ] Check title length (50-60 chars)
  - [ ] Check meta description (150-160 chars)
  - [ ] Check featured image exists
  - [ ] Check heading structure (H1 → H2 → H3)
  - [ ] Warn about missing alt text
  - [ ] Calculate readability score
  - [ ] Show SEO score (0-100)
- [ ] **Testing required**: Yes - Unit tests
- [ ] **Tests to write**: Unit test for SEO checks
- [ ] **Commit message**: "feat(admin): add SEO checklist to improve content quality"

---

#### 21. Markdown Split View (4 hours)
- [ ] **Status**: Not Started
- [ ] **Files to modify**: `admin/js/modules/posts.js`, `admin/js/modules/pages.js`
- [ ] **Changes needed**:
  - [ ] Configure EasyMDE for side-by-side mode
  - [ ] Add toggle button
  - [ ] Sync scroll between editor and preview
  - [ ] Save split view preference to localStorage
  - [ ] Test with long posts
- [ ] **Testing required**: Yes - Visual testing
- [ ] **Tests to write**: E2E test for split view toggle
- [ ] **Commit message**: "feat(admin): add split-view markdown editor with live preview"

**EasyMDE configuration**:
```javascript
const easyMDE = new EasyMDE({
  element: textarea,
  toolbar: [...],
  sideBySideFullscreen: false, // Allow side-by-side in normal mode
  previewClass: 'editor-preview',
  spellChecker: false
});

// Add custom toggle button
const splitViewToggle = document.createElement('button');
splitViewToggle.textContent = 'Split View';
splitViewToggle.addEventListener('click', () => {
  easyMDE.toggleSideBySide();
  const isSplit = easyMDE.isSideBySideActive();
  localStorage.setItem('editor_split_view', isSplit);
});

// Restore preference
const preferSplit = localStorage.getItem('editor_split_view') === 'true';
if (preferSplit) {
  easyMDE.toggleSideBySide();
}
```

---

## 🚀 Phase 3: Advanced Features (54 hours)

**Target Completion**: Month 2
**Progress**: 0/54 hours (0%)

### Major Features

#### 22. Bulk Operations (10 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 10 hours
- [ ] **Priority**: High
- [ ] **Commit message**: "feat(admin): add bulk operations for posts and pages"

#### 23. Post Analytics Dashboard (12 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 12 hours
- [ ] **Priority**: High
- [ ] **Commit message**: "feat(admin): add analytics dashboard with post insights"

#### 24. Post Series/Collections (8 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 8 hours
- [ ] **Priority**: Medium
- [ ] **Commit message**: "feat(content): add post series for related content grouping"

#### 25. Image Optimization Tools (8 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 8 hours
- [ ] **Priority**: Medium
- [ ] **Commit message**: "feat(admin): add image optimization tools and insights"

#### 26. Revision History (12 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 12 hours
- [ ] **Priority**: Medium
- [ ] **Commit message**: "feat(admin): add revision history with visual diff viewer"

#### 27. Table of Contents (4 hours)
- [ ] **Status**: Not Started
- [ ] **Estimated effort**: 4 hours
- [ ] **Priority**: Low
- [ ] **Commit message**: "feat(content): add auto-generated table of contents for posts"

---

## 📈 Progress Tracking

### Completed Hours by Phase
- Phase 1: 9.5/22 hours (43%)
- Phase 2: 0/42 hours (0%)
- Phase 3: 0/54 hours (0%)
- **Total: 9.5/118 hours (8%)**

### Completed Tasks
1. ✅ #1 Open Graph Meta Tags (2 hours)
2. ✅ #2 Color Contrast Issues (2 hours)
3. ✅ #3 Focus Indicators (2 hours)
4. ✅ #4 robots.txt (0.5 hours)
5. ✅ #5 Pagination SEO Links (1 hour)
6. ✅ #6 JSON-LD Schema (1 hour - isPartOf added)
7. ✅ #7 Image Alt Text (2 hours - 200+ images fixed)

### Current Blockers
None

### Next Session Plan
Start with item #8: Move inline CSS to external files

---

## 🧪 Testing Status

### Tests Written
- [ ] Phase 1: 0/3 test files
- [ ] Phase 2: 0/8 test files
- [ ] Phase 3: 0/6 test files

### Test Coverage
- Current: Unknown (run `npm run test:coverage`)
- Target: 80%+ lines, functions, statements; 75%+ branches

### E2E Tests
- [ ] Phase 1: 2 new E2E tests
- [ ] Phase 2: 4 new E2E tests
- [ ] Phase 3: 3 new E2E tests

---

## 📝 Commit History

### Phase 1 Commits
1. [ ] feat(seo): add Open Graph and Twitter Card meta tags for social sharing
2. [ ] fix(a11y): improve color contrast ratios to meet WCAG AA standards
3. [ ] feat(a11y): add visible focus indicators for keyboard navigation
4. [ ] feat(seo): add robots.txt to control crawler access
5. [ ] feat(seo): add rel=prev/next links for paginated pages
6. [ ] feat(seo): enhance JSON-LD structured data with additional schema properties
7. [ ] fix(a11y): improve image alt text descriptions for screen readers
8. [ ] refactor(css): move inline CSS to external stylesheets per project guidelines
9. [ ] refactor(admin): centralize deployment tracking logic to eliminate duplication
10. [ ] perf(assets): replace Font Awesome with inline SVG icons (-83% size)
11. [ ] perf(preload): optimize resource hints to prioritize critical domains
12. [ ] feat(a11y): enhance form accessibility with ARIA attributes

### Phase 2 Commits
(To be added as work progresses)

### Phase 3 Commits
(To be added as work progresses)

---

## 🎯 Key Metrics

### Baseline (Before Audit)
- [ ] Lighthouse Performance: __/100
- [ ] Lighthouse Accessibility: __/100
- [ ] Lighthouse Best Practices: __/100
- [ ] Lighthouse SEO: __/100
- [ ] Total CSS size: ~60KB
- [ ] Total JS size: __KB
- [ ] Font Awesome size: ~300KB
- [ ] First Contentful Paint: <2s
- [ ] Largest Contentful Paint: __s
- [ ] Time to Interactive: __s
- [ ] Total Blocking Time: __ms
- [ ] Cumulative Layout Shift: __

### After Phase 1 (Target)
- [ ] Lighthouse Performance: 95+/100
- [ ] Lighthouse Accessibility: 95+/100
- [ ] Lighthouse Best Practices: 95+/100
- [ ] Lighthouse SEO: 100/100
- [ ] Total CSS size: ~55KB (-8%)
- [ ] Total JS size: __KB
- [ ] Font Awesome: ~5KB (-98%)
- [ ] First Contentful Paint: <1.5s
- [ ] Largest Contentful Paint: <2.5s
- [ ] Time to Interactive: <3.5s
- [ ] Total Blocking Time: <200ms
- [ ] Cumulative Layout Shift: <0.1

### After Phase 2 (Target)
- User engagement: +20-30%
- Admin efficiency: +40%
- Content planning: Significantly improved

### After Phase 3 (Target)
- Professional-grade CMS experience
- Best-in-class blog UX
- Comprehensive analytics insights

---

## 🐛 Known Issues

### Critical
1. Inline CSS in comments.html (150 lines) - violates project guidelines

### High
1. Missing Open Graph meta tags - poor social sharing
2. Color contrast failures - accessibility issues
3. Font Awesome bloat - 300KB wasted

### Medium
1. No focus indicators - keyboard navigation issues
2. Duplicate deployment tracking code
3. No robots.txt
4. Image alt text needs audit

### Low
1. No pagination SEO links
2. JSON-LD schema missing some properties
3. Redundant preconnect hints
4. Form accessibility could be better

---

## 📚 Resources & References

### Documentation
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Open Graph Protocol: https://ogp.me/
- Schema.org: https://schema.org/
- Google Search Central: https://developers.google.com/search/docs

### Testing Tools
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Google Rich Results Test: https://search.google.com/test/rich-results
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- WebPageTest: https://www.webpagetest.org/
- Lighthouse: Chrome DevTools
- axe DevTools: Browser extension

### Build Commands
```bash
# CSS build
npm run build:css

# JS build
npm run build:js

# Jekyll build
bundle exec jekyll build

# Run tests
npm test
npm run test:coverage
npm run test:e2e

# Local development
npm run dev
# or
bundle exec jekyll serve
```

---

## 💡 Notes & Learnings

### Session 1 (2025-11-21)
- Completed comprehensive audit
- Identified 27 improvement items across 3 phases
- Created this tracking document

### Session 2
(To be filled in...)

---

## 🔄 Recovery Instructions

### If Claude Crashes/Restarts

1. **Read this document first**: `/Users/matthewfrench/circleseven-website/AUDIT_IMPLEMENTATION_TRACKER.md`

2. **Check current phase**: Look at "Progress Tracking" section

3. **Find next task**: Look for first unchecked [ ] task in current phase

4. **Review context**: Read the task's implementation notes

5. **Check for in-progress work**:
   ```bash
   git status
   git diff
   ```

6. **Resume work**: Pick up where left off, or start next task

### Quick Status Check
```bash
# See what's been done
git log --oneline --grep="feat\|fix\|refactor\|perf" -20

# See current changes
git status

# See test status
npm run test:coverage
```

### If Confused
- Re-read the audit report (in previous conversation)
- Check the detailed implementation notes for current task
- Look at "Files to modify" and "Changes needed" for each task
- Review "Testing required" section before committing

---

## ✅ Completion Criteria

### Phase 1 Complete When:
- [ ] All 12 tasks marked complete
- [ ] All commits pushed to repository
- [ ] Lighthouse scores meet targets
- [ ] Accessibility audit passes
- [ ] All tests pass
- [ ] Build completes without errors
- [ ] Site deployed successfully
- [ ] Visual regression test passes

### Phase 2 Complete When:
- [ ] All 9 tasks marked complete
- [ ] All features working in production
- [ ] User testing completed
- [ ] Documentation updated
- [ ] Tests at 80%+ coverage

### Phase 3 Complete When:
- [ ] All 6 tasks marked complete
- [ ] All features stable and tested
- [ ] Performance targets met
- [ ] User feedback incorporated

### Project Complete When:
- [ ] All 3 phases complete
- [ ] Final audit shows improvements
- [ ] Documentation up-to-date
- [ ] No critical bugs
- [ ] Stakeholder approval

---

## 🎉 Success Metrics

### Technical Metrics
- [ ] Lighthouse scores: All 95+
- [ ] Test coverage: 80%+
- [ ] Build time: <3 minutes
- [ ] Zero console errors
- [ ] WCAG AA compliant

### User Metrics
- [ ] Bounce rate: -10%
- [ ] Session duration: +20%
- [ ] Pages/session: +15%
- [ ] Social shares: +50%

### Admin Metrics
- [ ] Time to publish: -50%
- [ ] SEO errors: -80%
- [ ] Content issues: -70%

---

**Last Updated**: 2025-11-21
**Next Review**: After Phase 1 completion
**Contact**: Check git log for commit author

---

*This document should be updated after each work session to track progress and ensure continuity.*
