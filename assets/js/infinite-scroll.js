/**
 * Infinite Scroll - Auto-Load
 * Automatic scroll-based content loading for Jekyll blog
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    container: '.post-grid',
    loadingClass: 'loading',
    scrollThreshold: 300 // pixels from bottom to trigger auto-load
  };

  // State
  let isLoading = false;
  let currentPage = 1;
  let totalPages = 1;
  let hasNextPage = false;
  let loadingIndicator = null;

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    initInfiniteScroll();
  });

  function initInfiniteScroll() {
    const container = document.querySelector(config.container);
    if (!container) return;

    // Get pagination info from the page
    const paginationInfo = getPaginationInfo();
    if (!paginationInfo) return;

    currentPage = paginationInfo.currentPage;
    totalPages = paginationInfo.totalPages;
    hasNextPage = paginationInfo.hasNext;

    // Only initialize if there are more pages
    if (!hasNextPage) return;

    // Create loading indicator
    createLoadingIndicator();

    // Setup scroll listener for auto-load
    window.addEventListener('scroll', handleScroll);
  }

  function getPaginationInfo() {
    // Try to extract pagination info from existing pagination element
    const pagination = document.querySelector('.pagination');
    if (!pagination) return null;

    const pageNumber = pagination.querySelector('.page-number');
    if (!pageNumber) return null;

    // Extract "Page X of Y"
    const match = pageNumber.textContent.match(/Page (\d+) of (\d+)/);
    if (!match) return null;

    const currentPage = parseInt(match[1]);
    const totalPages = parseInt(match[2]);
    const hasNext = currentPage < totalPages;

    return { currentPage, totalPages, hasNext };
  }

  function createLoadingIndicator() {
    const container = document.querySelector(config.container);
    const pagination = document.querySelector('.pagination');

    // Create loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'load-more-container';

    // Create loading spinner
    const spinner = document.createElement('div');
    spinner.className = 'load-more-spinner';
    spinner.innerHTML = `
      <div class="spinner"></div>
      <span>Loading more posts...</span>
    `;
    spinner.style.display = 'none'; // Hidden by default

    loadingContainer.appendChild(spinner);
    loadingIndicator = spinner;

    // Insert after grid
    if (pagination) {
      pagination.parentNode.insertBefore(loadingContainer, pagination);
      // Hide old pagination
      pagination.style.display = 'none';
      const paginationPages = document.querySelector('.pagination-pages');
      if (paginationPages) paginationPages.style.display = 'none';
    } else {
      container.parentNode.insertBefore(loadingContainer, container.nextSibling);
    }
  }

  function handleScroll() {
    if (isLoading || !hasNextPage) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.offsetHeight;
    const threshold = config.scrollThreshold;

    // Check if user is near bottom
    if (scrollPosition >= documentHeight - threshold) {
      loadNextPage();
    }
  }

  function loadNextPage() {
    if (isLoading || !hasNextPage) return;

    isLoading = true;

    // Show loading spinner
    if (loadingIndicator) loadingIndicator.style.display = 'flex';

    // Calculate next page URL
    const nextPage = currentPage + 1;
    const nextPageUrl = getPageUrl(nextPage);

    // Fetch next page
    fetch(nextPageUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load page');
        return response.text();
      })
      .then(html => {
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract post cards
        const newCards = doc.querySelectorAll('.post-card');
        const container = document.querySelector(config.container);

        if (newCards.length === 0) {
          throw new Error('No posts found on next page');
        }

        // Append new cards with animation
        newCards.forEach((card, index) => {
          // Remove 'featured' class from newly loaded cards to maintain grid layout
          card.classList.remove('featured');

          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          container.appendChild(card);

          // Animate in
          setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, index * 50);
        });

        // Update state
        currentPage = nextPage;
        hasNextPage = currentPage < totalPages;

        // Hide spinner or show end message
        if (hasNextPage) {
          if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
          const loadMoreContainer = document.querySelector('.load-more-container');
          if (loadMoreContainer) {
            loadMoreContainer.innerHTML = '<p class="no-more-posts">You\'ve reached the end!</p>';
          }
        }

        isLoading = false;
      })
      .catch(error => {
        console.error('Error loading more posts:', error);

        // Hide spinner on error
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        isLoading = false;
      });
  }

  function getPageUrl(pageNum) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');

    if (pageNum === 1) {
      return baseUrl + '/';
    }

    // Use Jekyll's paginate_path format
    return baseUrl.replace(/\/page\/\d+/, '') + '/page/' + pageNum + '/';
  }

})();
