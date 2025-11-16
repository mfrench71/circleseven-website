/**
 * Lazy Gallery Image Loader
 *
 * Uses Intersection Observer to defer loading of gallery images until they're
 * near the viewport. Dramatically reduces initial page load for posts with
 * large image galleries.
 *
 * Features:
 * - Loads images 400px before they enter viewport
 * - Uses low-quality placeholders initially
 * - Adds smooth fade-in animation when image loads
 * - Falls back to native lazy loading if Intersection Observer not supported
 */

(function() {
  'use strict';

  const config = {
    rootMargin: '400px', // Start loading 400px before visible
    threshold: 0.01
  };

  /**
   * Initialize lazy loading for all gallery images
   */
  function initLazyGalleries() {
    // Find all galleries on the page
    const galleries = document.querySelectorAll('.gallery, .wp-block-gallery');

    if (!galleries.length) {
      return;
    }

    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
      console.log('[LazyGallery] IntersectionObserver not supported, using native lazy loading');
      return; // Fall back to native loading="lazy"
    }

    console.log(`[LazyGallery] Initializing lazy loading for ${galleries.length} galleries`);

    galleries.forEach(gallery => {
      const images = gallery.querySelectorAll('img');

      console.log(`[LazyGallery] Processing ${images.length} images in gallery`);

      images.forEach(img => {
        // Skip if already processed
        if (img.hasAttribute('data-lazy-processed')) {
          return;
        }

        // Store actual src/srcset in data attributes
        const actualSrc = img.getAttribute('src');
        const actualSrcset = img.getAttribute('srcset');

        if (actualSrc) {
          img.setAttribute('data-src', actualSrc);

          // Replace with low-quality placeholder
          const placeholder = generatePlaceholder(actualSrc);
          img.setAttribute('src', placeholder);

          // Remove srcset temporarily
          if (actualSrcset) {
            img.setAttribute('data-srcset', actualSrcset);
            img.removeAttribute('srcset');
          }

          // Mark as lazy loading
          img.classList.add('lazy-gallery-image');
          img.setAttribute('data-lazy-processed', 'true');
        }
      });

      // Create observer for this gallery's images
      const observer = new IntersectionObserver(onIntersection, config);
      images.forEach(img => {
        if (img.hasAttribute('data-lazy-processed')) {
          observer.observe(img);
        }
      });
    });
  }

  /**
   * Handle intersection events
   */
  function onIntersection(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Load the actual high-quality image
   */
  function loadImage(img) {
    const src = img.getAttribute('data-src');
    const srcset = img.getAttribute('data-srcset');

    if (!src) return;

    // Create a new image to preload
    const tempImg = new Image();

    tempImg.onload = function() {
      // Replace placeholder with actual image
      if (srcset) {
        img.setAttribute('srcset', srcset);
      }
      img.setAttribute('src', src);

      // Add loaded class for fade-in animation
      img.classList.add('loaded');
      img.classList.remove('lazy-gallery-image');

      // Clean up data attributes
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };

    tempImg.onerror = function() {
      console.error('[LazyGallery] Failed to load image:', src);
      // Still remove lazy class to prevent infinite shimmer
      img.classList.remove('lazy-gallery-image');
    };

    // Start loading
    if (srcset) {
      tempImg.srcset = srcset;
    }
    tempImg.src = src;
  }

  /**
   * Generate a low-quality placeholder URL using Cloudinary transformations
   */
  function generatePlaceholder(src) {
    // Check if it's a Cloudinary URL
    if (!src.includes('cloudinary.com')) {
      return src; // Return original if not Cloudinary
    }

    // Replace transformation with ultra-low quality blur
    // This creates a tiny blurred preview (~5-10KB instead of ~150KB)
    if (src.includes('/upload/')) {
      // Find the transformation part and replace it
      return src.replace(
        /\/upload\/[^/]+\//,
        '/upload/q_auto:low,w_50,e_blur:1000,f_auto/'
      );
    }

    return src;
  }

  /**
   * Initialize when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyGalleries);
  } else {
    initLazyGalleries();
  }

  /**
   * Re-initialize if new galleries are added dynamically
   */
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          // Check if any galleries were added
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && (node.matches('.gallery, .wp-block-gallery') || node.querySelector('.gallery, .wp-block-gallery'))) {
              initLazyGalleries();
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
