// Bundle entry point - Core scripts only, conditional loading for features

// Core scripts (always needed)
import './menu.js';
import './back-to-top.js';
import './edit-links.js';

// Conditional loading based on page content
document.addEventListener('DOMContentLoaded', () => {
  // Load lazy-cards only on pages with post grids
  if (document.querySelector('.post-grid')) {
    import('./lazy-cards.js');
  }

  // Load gallery scripts only on pages with galleries
  if (document.querySelector('.gallery, .wp-block-gallery')) {
    Promise.all([
      import('./lazy-gallery.js'),
      import('./gallery-fix.js'),
      import('./lightbox.js')
    ]);
  }

  // Load code-copy only on pages with code blocks
  if (document.querySelector('pre code')) {
    import('./code-copy.js');
  }

  // Load embeds only on pages with iframes or videos
  if (document.querySelector('.post-content iframe, .post-content video, .page-content iframe, .page-content video')) {
    import('./embeds.js');
  }
});
