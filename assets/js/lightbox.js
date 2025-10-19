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

    // Add glightbox class to all image links (including Cloudinary URLs without extensions)
    const imageLinks = document.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"], figure a[href*="cloudinary.com/"]');

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

      // Disable zoom so images always fit viewport
      zoomable: false,
      draggable: false,

      // Skin
      skin: 'clean',

      // Slide effect
      slideEffect: 'slide',

      // Descriptions from alt text or figcaption
      descPosition: 'bottom',

      // Set max width and height to ensure images fit
      width: '90vw',
      height: '90vh',

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
   * Group images within the same gallery container
   * This enables navigation between images in the same gallery only
   */
  function groupGalleryImages() {
    // Find all gallery containers
    const galleries = document.querySelectorAll('.gallery, .wp-block-gallery');
    let galleryIndex = 0;

    galleries.forEach((gallery) => {
      const imageLinks = gallery.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"], figure a[href*="cloudinary.com/"]');

      // Add gallery attribute to group images within this specific gallery
      if (imageLinks.length > 0) {
        imageLinks.forEach(link => {
          link.setAttribute('data-gallery', `gallery-${galleryIndex}`);

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
        galleryIndex++;
      }
    });

    // Handle standalone images (not in a gallery) - each gets its own gallery
    const postContents = document.querySelectorAll('.post-content, .page-content, article');
    postContents.forEach((content) => {
      const standaloneImageLinks = content.querySelectorAll('figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*=".jpg"], figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*=".jpeg"], figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*=".png"], figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*=".gif"], figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*=".webp"], figure:not(.gallery figure):not(.wp-block-gallery figure) a[href*="cloudinary.com/"]');

      standaloneImageLinks.forEach(link => {
        // Each standalone image gets its own unique gallery (no navigation to other images)
        link.setAttribute('data-gallery', `standalone-${galleryIndex}`);

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
        galleryIndex++;
      });
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
              node.querySelectorAll('figure a[href*=".jpg"], figure a[href*=".jpeg"], figure a[href*=".png"], figure a[href*=".gif"], figure a[href*=".webp"], figure a[href*="cloudinary.com/"]') :
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
