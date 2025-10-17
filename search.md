---
layout: page
title: Search
permalink: /search/
---

<div id="search-container">
  <input type="text" id="search-input" placeholder="Search posts..." style="width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px;">
  <div id="results-container"></div>
</div>

<script src="https://unpkg.com/lunr/lunr.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', (event) => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    let searchData = [];
    let idx;

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
        performSearch(query);
      } else {
        resultsContainer.innerHTML = '';
      }
    });

    function performSearch(query) {
      try {
        const results = idx.search(query);
        displayResults(results);
      } catch (e) {
        // Handle search errors gracefully
        resultsContainer.innerHTML = '<p>Please enter a valid search term.</p>';
      }
    }

    function displayResults(results) {
      if (results.length > 0) {
        let html = '<h2>Search Results (' + results.length + ')</h2><ul style="list-style: none; padding: 0;">';

        results.forEach(function(result) {
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
      } else {
        resultsContainer.innerHTML = '<p>No results found for "' + searchInput.value + '"</p>';
      }
    }
  });
</script>
