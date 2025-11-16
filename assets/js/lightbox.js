/**
 * GLightbox Initialization
 * Enables lightbox for all image links in posts
 * Deferred initialization for better performance
 */

(function() {
  'use strict';

  let lightboxInitialized = false;
  let lightboxInstance = null;

  // Wait for DOM and GLightbox to be ready
  function initLightbox() {
    if (typeof GLightbox === 'undefined' || lightboxInitialized) {
      return;
    }

    console.log('[Lightbox] Initializing GLightbox');

    // Add glightbox class to image links, excluding video embeds
    const imageLinks = document.querySelectorAll('figure a');

    imageLinks.forEach(link => {
      const hasImg = link.querySelector('img');
      const isFigureWithVideo = link.closest('figure').querySelector('iframe, video');

      if (hasImg && !isFigureWithVideo) {
        link.classList.add('glightbox');
        // Force GLightbox to treat this as an image, not external content
        link.setAttribute('data-type', 'image');

        // Use data-full-src if available (for lazy-loaded thumbnails)
        const img = link.querySelector('img');
        const fullSrc = img.getAttribute('data-full-src');
        if (fullSrc) {
          link.setAttribute('href', fullSrc);
        }
      }
    });

    // Group images by post/gallery for better navigation
    groupGalleryImages();

    // Initialize GLightbox - use simple selector
    lightboxInstance = GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      closeOnOutsideClick: true,
      keyboardNavigation: true,
      skin: 'clean',
      width: '95vw',
      height: '90vh',
      zoomable: false,
      draggable: false,

      onOpen: function() {
        document.body.classList.add('glightbox-open');
      },

      onClose: function() {
        document.body.classList.remove('glightbox-open');
      }
    });

    lightboxInitialized = true;
    console.log('[Lightbox] Initialization complete');
  }

  /**
   * Defer lightbox initialization until first gallery interaction
   * or gallery enters viewport
   */
  function deferredInit() {
    const galleries = document.querySelectorAll('.gallery, .wp-block-gallery');

    if (!galleries.length) {
      // No galleries, just initialize normally
      initLightbox();
      return;
    }

    // Initialize on first click on any gallery image
    document.addEventListener('click', function handleFirstClick(e) {
      if (e.target.closest('.gallery figure a, figure a')) {
        console.log('[Lightbox] First gallery click detected, initializing...');
        if (!lightboxInitialized) {
          e.preventDefault();
          initLightbox();
          // Re-trigger the click after initialization
          setTimeout(() => {
            e.target.closest('a').click();
          }, 100);
          document.removeEventListener('click', handleFirstClick);
        }
      }
    });

    // Or initialize when first gallery enters viewport
    if ('IntersectionObserver' in window) {
      const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !lightboxInitialized) {
            console.log('[Lightbox] Gallery in viewport, initializing...');
            initLightbox();
            galleryObserver.disconnect();
          }
        });
      }, { rootMargin: '200px' });

      galleries.forEach(gallery => {
        galleryObserver.observe(gallery);
      });
    } else {
      // Fallback: initialize immediately if no IntersectionObserver
      initLightbox();
    }
  }

  // Start deferred initialization on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deferredInit);
  } else {
    // DOM already loaded
    deferredInit();
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
      const allLinks = gallery.querySelectorAll('figure a');
      const imageLinks = [];

      // Filter to only links with img tags (no iframes/videos)
      allLinks.forEach(link => {
        const hasImg = link.querySelector('img');
        const isFigureWithVideo = link.closest('figure').querySelector('iframe, video');
        if (hasImg && !isFigureWithVideo) {
          imageLinks.push(link);
        }
      });

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
      const allStandaloneLinks = content.querySelectorAll('figure:not(.gallery figure):not(.wp-block-gallery figure) a');

      allStandaloneLinks.forEach(link => {
        // Only process links with img tags (not iframes/videos)
        const hasImg = link.querySelector('img');
        const isFigureWithVideo = link.closest('figure').querySelector('iframe, video');

        if (hasImg && !isFigureWithVideo) {
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
        }
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
            const allNewLinks = node.querySelectorAll ? node.querySelectorAll('figure a') : [];
            const newImageLinks = [];

            allNewLinks.forEach(link => {
              const hasImg = link.querySelector('img');
              const isFigureWithVideo = link.closest('figure').querySelector('iframe, video');
              if (hasImg && !isFigureWithVideo) {
                newImageLinks.push(link);
              }
            });

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
