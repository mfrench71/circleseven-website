/**
 * Gallery Auto-Wrapper and Image URL Fixer
 * Wraps consecutive figures in gallery divs and fixes image URLs
 */

(function() {
  'use strict';

  function fixGalleriesAndImages() {
    const postContent = document.querySelector('.post-content, .page-content');
    if (!postContent) return;

    // Fix image URLs first
    fixImageUrls(postContent);

    // Then wrap consecutive figures
    wrapConsecutiveFigures(postContent);
  }

  /**
   * Fix image URLs that point to /circleseven-website/wp-content or {{ site.baseurl }}/wp-content
   * Rewrite them to point to https://www.circleseven.co.uk/wp-content
   */
  function fixImageUrls(container) {
    // Fix all links and images
    const links = container.querySelectorAll('a[href*="/wp-content"], a[href*="site.baseurl"]');
    const images = container.querySelectorAll('img[src*="/wp-content"], img[src*="circleseven.co.uk"]');

    links.forEach(link => {
      let href = link.getAttribute('href');

      // Replace {{ site.baseurl }}/wp-content with full URL
      href = href.replace(/\{\{\s*site\.baseurl\s*\}\}\/wp-content/, 'https://www.circleseven.co.uk/wp-content');

      // Replace /circleseven-website/wp-content with full URL
      href = href.replace(/\/circleseven-website\/wp-content/, 'https://www.circleseven.co.uk/wp-content');

      // Replace any other /wp-content paths
      if (href.includes('/wp-content') && !href.startsWith('http')) {
        href = 'https://www.circleseven.co.uk' + href.replace(/^.*?(\/wp-content)/, '$1');
      }

      link.setAttribute('href', href);
    });

    images.forEach(img => {
      let src = img.getAttribute('src');

      // If src already points to circleseven.co.uk, we're good
      if (src.includes('circleseven.co.uk')) {
        return;
      }

      // Replace {{ site.baseurl }}/wp-content with full URL
      src = src.replace(/\{\{\s*site\.baseurl\s*\}\}\/wp-content/, 'https://www.circleseven.co.uk/wp-content');

      // Replace /circleseven-website/wp-content with full URL
      src = src.replace(/\/circleseven-website\/wp-content/, 'https://www.circleseven.co.uk/wp-content');

      // Replace any other /wp-content paths
      if (src.includes('/wp-content') && !src.startsWith('http')) {
        src = 'https://www.circleseven.co.uk' + src.replace(/^.*?(\/wp-content)/, '$1');
      }

      img.setAttribute('src', src);
    });
  }

  /**
   * Wrap consecutive figure elements in a gallery div
   */
  function wrapConsecutiveFigures(container) {
    const allFigures = Array.from(container.querySelectorAll('figure'));
    if (allFigures.length < 2) return;

    let consecutiveGroups = [];
    let currentGroup = [];

    allFigures.forEach((figure, index) => {
      // Check if this figure is immediately after the previous one
      const prevFigure = allFigures[index - 1];

      if (prevFigure) {
        // Check if they're siblings or very close
        const isSibling = figure.previousElementSibling === prevFigure;
        const parentIsSame = figure.parentNode === prevFigure.parentNode;

        if (isSibling || (parentIsSame && isCloseToEachOther(prevFigure, figure))) {
          if (currentGroup.length === 0) {
            currentGroup.push(prevFigure);
          }
          currentGroup.push(figure);
        } else {
          // Not consecutive, save current group if it has 2+ items
          if (currentGroup.length >= 2) {
            consecutiveGroups.push([...currentGroup]);
          }
          currentGroup = [];
        }
      }

      // Last figure - check if we need to save the group
      if (index === allFigures.length - 1 && currentGroup.length >= 2) {
        consecutiveGroups.push([...currentGroup]);
      }
    });

    // Wrap each group in a gallery div
    consecutiveGroups.forEach(group => {
      const firstFigure = group[0];
      const parentNode = firstFigure.parentNode;

      // Create gallery wrapper
      const galleryDiv = document.createElement('div');
      galleryDiv.className = 'gallery';

      // Insert gallery div before first figure
      parentNode.insertBefore(galleryDiv, firstFigure);

      // Move all figures into gallery div
      group.forEach(figure => {
        galleryDiv.appendChild(figure);
      });
    });
  }

  /**
   * Check if two elements are close to each other (no other elements between them)
   */
  function isCloseToEachOther(elem1, elem2) {
    let current = elem1.nextSibling;
    while (current && current !== elem2) {
      // If there's any element node between them (not just text), they're not close
      if (current.nodeType === 1 && current.tagName !== 'FIGURE') {
        return false;
      }
      current = current.nextSibling;
    }
    return current === elem2;
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixGalleriesAndImages);
  } else {
    fixGalleriesAndImages();
  }

  // Also run after a short delay to catch any dynamically loaded content
  window.addEventListener('load', function() {
    setTimeout(fixGalleriesAndImages, 100);
  });

})();
