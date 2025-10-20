/**
 * Edit Links for Decap CMS
 * Shows edit buttons on posts and cards when user is logged in via Netlify Identity
 */

(function() {
  'use strict';

  // Wait for Netlify Identity to be ready
  if (window.netlifyIdentity) {
    netlifyIdentity.on('init', user => {
      updateEditLinks(user);
    });

    netlifyIdentity.on('login', user => {
      updateEditLinks(user);
    });

    netlifyIdentity.on('logout', () => {
      updateEditLinks(null);
    });

    // Check initial state
    netlifyIdentity.on('ready', () => {
      const user = netlifyIdentity.currentUser();
      updateEditLinks(user);
    });
  }

  /**
   * Show or hide edit links based on user authentication
   */
  function updateEditLinks(user) {
    const editLinks = document.querySelectorAll('.edit-post-link, .edit-card-link');

    editLinks.forEach(link => {
      if (user) {
        link.style.display = '';
        link.classList.add('edit-link-visible');
      } else {
        link.style.display = 'none';
        link.classList.remove('edit-link-visible');
      }
    });
  }

  /**
   * Generate CMS edit URL for a post
   */
  function getEditUrl(postSlug) {
    // Remove date prefix from slug if it exists (YYYY-MM-DD-)
    const cleanSlug = postSlug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return `/admin/#/collections/blog/entries/${postSlug}`;
  }

  // Expose globally for inline use
  window.getEditUrl = getEditUrl;
})();
