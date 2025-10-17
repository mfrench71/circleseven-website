---
layout: page
title: Search
permalink: /search/
---

<div id="search-container">
  <input type="text" id="search-input" placeholder="Search posts..." style="width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; box-sizing: border-box; max-width: 100%;">
  <div id="results-container"></div>
  <div id="pagination-container" style="margin-top: 30px;"></div>
</div>

<script src="https://unpkg.com/lunr/lunr.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', (event) => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const paginationContainer = document.getElementById('pagination-container');
    let searchData = [];
    let idx;
    let currentResults = [];
    let currentPage = 1;
    const resultsPerPage = 10;

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

    // Search on input
    searchInput.addEventListener('input', function() {
      const query = this.value;
      if (query.length > 2) {
        currentPage = 1;
        performSearch(query);
      } else {
        resultsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';
      }
    });

    function performSearch(query) {
      try {
        const results = idx.search(query);
        currentResults = results;
        displayResults(results, currentPage);
      } catch (e) {
        // Handle search errors gracefully
        resultsContainer.innerHTML = '<p>Please enter a valid search term.</p>';
        paginationContainer.innerHTML = '';
      }
    }

    function displayResults(results, page) {
      if (results.length > 0) {
        const totalPages = Math.ceil(results.length / resultsPerPage);
        const startIndex = (page - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const pageResults = results.slice(startIndex, endIndex);

        let html = '<h2>Search Results (' + results.length + ')</h2><ul style="list-style: none; padding: 0;">';

        pageResults.forEach(function(result) {
          const item = searchData.find(post => post.url === result.ref);
          if (item) {
            html += '<li style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">';
            html += '<h3 style="margin: 0;"><a href="' + item.url + '">' + item.title + '</a></h3>';
            html += '<p style="color: #666; font-size: 14px; margin: 5px 0;">' + item.date;
            if (item.category) {
              html += ' &bull; ' + item.category;
            }
            html += '</p>';

            // Show excerpt
            const excerpt = item.content.substring(0, 200) + '...';
            html += '<p style="margin: 10px 0 0 0;">' + excerpt + '</p>';
            html += '</li>';
          }
        });

        html += '</ul>';
        resultsContainer.innerHTML = html;

        // Display pagination
        if (totalPages > 1) {
          displayPagination(page, totalPages);
        } else {
          paginationContainer.innerHTML = '';
        }
      } else {
        resultsContainer.innerHTML = '<p>No results found for "' + searchInput.value + '"</p>';
        paginationContainer.innerHTML = '';
      }
    }

    function displayPagination(page, totalPages) {
      let html = '<div class="pagination" style="margin: 30px 0; text-align: center; padding: 20px 0; border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8;">';

      // Previous button
      if (page > 1) {
        html += '<a href="#" class="previous" data-page="' + (page - 1) + '" style="padding: 8px 16px; margin: 0 5px; text-decoration: none; color: #2a7ae2;">← Previous</a>';
      } else {
        html += '<span class="previous disabled" style="padding: 8px 16px; margin: 0 5px; color: #828282;">← Previous</span>';
      }

      // Page number
      html += '<span class="page-number" style="padding: 8px 16px; margin: 0 5px; font-weight: bold; color: #111;">Page ' + page + ' of ' + totalPages + '</span>';

      // Next button
      if (page < totalPages) {
        html += '<a href="#" class="next" data-page="' + (page + 1) + '" style="padding: 8px 16px; margin: 0 5px; text-decoration: none; color: #2a7ae2;">Next →</a>';
      } else {
        html += '<span class="next disabled" style="padding: 8px 16px; margin: 0 5px; color: #828282;">Next →</span>';
      }

      html += '</div>';

      // Page numbers
      html += '<div class="pagination-pages" style="text-align: center; margin: 20px 0;">';
      for (let i = 1; i <= totalPages; i++) {
        if (i === page) {
          html += '<span class="current" style="padding: 8px 12px; margin: 0 2px; border: 1px solid #2a7ae2; border-radius: 3px; display: inline-block; background: #2a7ae2; color: white;">' + i + '</span>';
        } else {
          html += '<a href="#" data-page="' + i + '" style="padding: 8px 12px; margin: 0 2px; text-decoration: none; color: #2a7ae2; border: 1px solid #e8e8e8; border-radius: 3px; display: inline-block;">' + i + '</a>';
        }
      }
      html += '</div>';

      paginationContainer.innerHTML = html;

      // Add click handlers for pagination links
      paginationContainer.querySelectorAll('a[data-page]').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          currentPage = parseInt(this.getAttribute('data-page'));
          displayResults(currentResults, currentPage);
          window.scrollTo(0, 0);
        });
      });
    }
  });
</script>
