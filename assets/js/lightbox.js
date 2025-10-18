/**
 * GLightbox Initialization
 * Enables lightbox for all image links in posts
 */

(function() {
  'use strict';

  // Wait for DOM and GLightbox to be ready
  function initLightbox() {
    if (typeof GLightbox === 'undefined') {
      console.warn('GLightbox library not loaded');
      return;
    }

    // Add glightbox class to all image links
    const imageLinks = document.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"]');

    imageLinks.forEach(link => {
      link.classList.add('glightbox');
    });

    // Group images by post/gallery for better navigation
    groupGalleryImages();

    // Initialize GLightbox
    const lightbox = GLightbox({
      // Selector for image links with glightbox class
      selector: '.glightbox',

      // Touch navigation
      touchNavigation: true,

      // Loop through images
      loop: true,

      // Auto focus
      autoplayVideos: true,

      // Close on outside click
      closeOnOutsideClick: true,

      // Keyboard navigation
      keyboardNavigation: true,

      // Zoom
      zoomable: true,
      draggable: true,

      // Skin
      skin: 'clean',

      // Slide effect
      slideEffect: 'slide',

      // Descriptions from alt text or figcaption
      descPosition: 'bottom',

      // Custom callbacks
      onOpen: function() {
        // Add class to body when lightbox is open
        document.body.classList.add('glightbox-open');
      },

      onClose: function() {
        // Remove class when lightbox closes
        document.body.classList.remove('glightbox-open');
      }
    });
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
  } else {
    // DOM already loaded
    initLightbox();
  }

  /**
   * Group images within the same post content or gallery
   * This enables navigation between images in the same context
   */
  function groupGalleryImages() {
    // Find all post content areas
    const postContents = document.querySelectorAll('.post-content, .page-content, article');

    postContents.forEach((content, index) => {
      const imageLinks = content.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"]');

      // Add gallery attribute to group images
      if (imageLinks.length > 1) {
        imageLinks.forEach(link => {
          link.setAttribute('data-gallery', `gallery-${index}`);

          // Try to get description from figcaption or alt text
          const figure = link.closest('figure');
          if (figure) {
            const figcaption = figure.querySelector('figcaption');
            const img = link.querySelector('img');

            if (figcaption && figcaption.textContent.trim()) {
              link.setAttribute('data-glightbox', `description: ${figcaption.textContent.trim()}`);
            } else if (img && img.alt) {
              link.setAttribute('data-glightbox', `description: ${img.alt}`);
            }
          }
        });
      }
    });
  }

  // Re-initialize if content is dynamically loaded (e.g., infinite scroll)
  // Use MutationObserver to detect new images
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            // Find new image links
            const newImageLinks = node.querySelectorAll ?
              node.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"]') :
              [];

            if (newImageLinks.length > 0) {
              // Add glightbox class to new links
              newImageLinks.forEach(link => {
                link.classList.add('glightbox');
              });

              // Re-run grouping
              setTimeout(() => {
                groupGalleryImages();
                // Reinitialize lightbox
                initLightbox();
              }, 100);
            }
          }
        });
      }
    });
  });

  // Observe the post grid for new content
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      const postGrid = document.querySelector('.post-grid, .post-content, .page-content');
      if (postGrid) {
        observer.observe(postGrid, { childList: true, subtree: true });
      }
    });
  } else {
    const postGrid = document.querySelector('.post-grid, .post-content, .page-content');
    if (postGrid) {
      observer.observe(postGrid, { childList: true, subtree: true });
    }
  }

})();
