/**
 * GLightbox Initialization
 * Enables lightbox for all image links in posts
 */

(function() {
  'use strict';

  // Wait for DOM and GLightbox to be ready
  window.addEventListener('DOMContentLoaded', function() {
    if (typeof GLightbox === 'undefined') {
      console.warn('GLightbox library not loaded');
      return;
    }

    // Initialize GLightbox for all image links
    const lightbox = GLightbox({
      // Selector for image links
      selector: 'figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"], a[href*=".jpg"]:has(img), a[href*=".jpeg"]:has(img), a[href*=".png"]:has(img), a[href*=".gif"]:has(img), a[href*=".webp"]:has(img)',

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

    // Group images by post/gallery for better navigation
    groupGalleryImages();
  });

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
  document.addEventListener('contentLoaded', function() {
    groupGalleryImages();

    // Refresh GLightbox
    if (typeof GLightbox !== 'undefined') {
      GLightbox({
        selector: 'figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"]'
      });
    }
  });

})();
