---
layout: page
title: Search
permalink: /search/
---

<div id="search-container">
  <input type="text" id="search-input" placeholder="Search posts..." class="search-input">
  <div id="search-results-info" class="search-results-info"></div>
  <div id="results-container" class="post-grid"></div>
  <div id="loading-indicator" class="load-more-container" style="display: none;">
    <div class="load-more-spinner">
      <div class="spinner"></div>
      <span>Loading more results...</span>
    </div>
  </div>
</div>

<style>
.search-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 24px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #2a7ae2;
}

.search-results-info {
  color: #666;
  font-size: 14px;
  margin-bottom: 24px;
  font-weight: 500;
}
</style>

<script src="https://unpkg.com/lunr/lunr.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', (event) => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const resultsInfo = document.getElementById('search-results-info');
    const loadingIndicator = document.getElementById('loading-indicator');

    let searchData = [];
    let idx;
    let currentResults = [];
    let displayedCount = 0;
    const resultsPerLoad = 12; // Show 12 cards initially
    const loadMoreCount = 6;   // Load 6 more on scroll
    let isLoading = false;

    // Load search data
    fetch('{{ site.baseurl }}/search.json')
      .then(response => response.json())
      .then(data => {
        searchData = data;

        // Build Lunr index
        idx = lunr(function () {
          this.ref('url');
          this.field('title', { boost: 10 });
          this.field('category', { boost: 5 });
          this.field('content');

          searchData.forEach(function (doc) {
            this.add(doc);
          }, this);
        });

        // Get search query from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
          searchInput.value = query;
          performSearch(query);
        }
      });

    // Search on input (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      const query = this.value;

      searchTimeout = setTimeout(() => {
        if (query.length > 2) {
          performSearch(query);
        } else {
          resultsContainer.innerHTML = '';
          resultsInfo.innerHTML = '';
        }
      }, 300); // Debounce 300ms
    });

    // Scroll listener for infinite scroll
    window.addEventListener('scroll', function() {
      if (isLoading || displayedCount >= currentResults.length) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.offsetHeight;

      if (scrollPosition >= documentHeight - 300) {
        loadMoreResults();
      }
    });

    function performSearch(query) {
      try {
        const results = idx.search(query);
        currentResults = results;
        displayedCount = 0;
        resultsContainer.innerHTML = '';

        if (results.length > 0) {
          resultsInfo.innerHTML = `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`;
          displayResults(resultsPerLoad);
        } else {
          resultsInfo.innerHTML = `No results found for "${query}"`;
        }
      } catch (e) {
        resultsInfo.innerHTML = 'Please enter a valid search term.';
      }
    }

    function displayResults(count) {
      const endIndex = Math.min(displayedCount + count, currentResults.length);
      const resultsToShow = currentResults.slice(displayedCount, endIndex);

      resultsToShow.forEach((result, index) => {
        const item = searchData.find(post => post.url === result.ref);
        if (item) {
          const card = createPostCard(item);
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          resultsContainer.appendChild(card);

          // Animate in
          setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, index * 50);
        }
      });

      displayedCount = endIndex;
    }

    function loadMoreResults() {
      if (isLoading || displayedCount >= currentResults.length) return;

      isLoading = true;
      loadingIndicator.style.display = 'flex';

      setTimeout(() => {
        displayResults(loadMoreCount);
        loadingIndicator.style.display = 'none';
        isLoading = false;
      }, 500);
    }

    function createPostCard(item) {
      const article = document.createElement('article');
      article.className = 'post-card';

      // Slugify category for badge class
      const categorySlug = item.category ? item.category.toLowerCase().replace(/\s+/g, '-') : '';
      const categoryBadge = item.category ?
        `<a href="{{ site.baseurl }}/category/${categorySlug}/" class="category-badge badge-${categorySlug}">${item.category}</a>` : '';

      article.innerHTML = `
        <div class="post-card-image">
          <a href="${item.url}">
            <img src="${item.image || '{{ "/assets/images/default-post.svg" | relative_url }}'}"
                 alt="${item.title}"
                 loading="lazy"
                 onerror="this.src='{{ '/assets/images/default-post.svg' | relative_url }}'">
          </a>
        </div>
        <div class="post-card-content">
          ${categoryBadge}
          <h2 class="post-card-title">
            <a href="${item.url}">${item.title}</a>
          </h2>
          <p class="post-card-excerpt">${item.content.substring(0, 150)}...</p>
          <div class="post-card-meta">
            <img src="{{ '/assets/images/author.jpg' | relative_url }}"
                 alt="Matthew French"
                 class="post-author-avatar"
                 onerror="this.src='{{ '/assets/images/default-avatar.svg' | relative_url }}'">
            <div class="post-meta-info">
              <span class="post-author-name">Matthew French</span>
              <span class="post-date-reading">${item.date}</span>
            </div>
          </div>
        </div>
      `;

      return article;
    }
  });
</script>
