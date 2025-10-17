/**
 * Embedded Content Handler for Jekyll
 * Converts WordPress embed formats to responsive iframes
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    processWordPressEmbeds();
    processLegacyShortcodes();
    makeSketchfabResponsive();
    processLeafletMaps();
  });

  /**
   * Process WordPress Block Editor embeds
   * Converts URL-only embeds to proper iframes
   */
  function processWordPressEmbeds() {
    // Find all WordPress embed wrappers
    const embedWrappers = document.querySelectorAll('.wp-block-embed__wrapper');

    embedWrappers.forEach(function(wrapper) {
      const content = wrapper.textContent.trim();
      const url = content;

      // Skip if already has an iframe
      if (wrapper.querySelector('iframe')) {
        return;
      }

      let iframe = null;

      // YouTube embeds
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        iframe = createYouTubeEmbed(url);
      }
      // Vimeo embeds
      else if (url.includes('vimeo.com')) {
        iframe = createVimeoEmbed(url);
      }
      // SoundCloud embeds
      else if (url.includes('soundcloud.com')) {
        iframe = createSoundCloudEmbed(url);
      }

      // Replace content with iframe if created
      if (iframe) {
        wrapper.innerHTML = '';
        wrapper.appendChild(iframe);
      }
    });
  }

  /**
   * Process legacy WordPress [embed] shortcodes
   */
  function processLegacyShortcodes() {
    // Find all text nodes containing [embed]
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    const html = postContent.innerHTML;

    // Match [embed]URL[/embed] pattern
    const embedPattern = /\[embed\](.*?)\[\/embed\]/g;
    let newHtml = html;
    let match;

    while ((match = embedPattern.exec(html)) !== null) {
      const url = match[1].trim();
      let replacement = '';

      // Create appropriate embed based on URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          replacement = `<div class="embed-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        }
      } else if (url.includes('vimeo.com')) {
        const videoId = extractVimeoId(url);
        if (videoId) {
          replacement = `<div class="embed-container"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
        }
      }

      if (replacement) {
        newHtml = newHtml.replace(match[0], replacement);
      } else {
        // Show placeholder for unsupported embeds
        newHtml = newHtml.replace(match[0], `<div class="wordpress-embed-placeholder">Embed not supported: ${url}</div>`);
      }
    }

    if (newHtml !== html) {
      postContent.innerHTML = newHtml;
    }
  }

  /**
   * Create YouTube iframe embed
   */
  function createYouTubeEmbed(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'YouTube video player';

    return iframe;
  }

  /**
   * Create Vimeo iframe embed
   */
  function createVimeoEmbed(url) {
    const videoId = extractVimeoId(url);
    if (!videoId) return null;

    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${videoId}`;
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'Vimeo video player';

    return iframe;
  }

  /**
   * Create SoundCloud iframe embed
   */
  function createSoundCloudEmbed(url) {
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '166';
    iframe.scrolling = 'no';
    iframe.frameBorder = 'no';
    iframe.allow = 'autoplay';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
    iframe.title = 'SoundCloud player';

    return iframe;
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  function extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (let pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Extract Vimeo video ID from URL
   */
  function extractVimeoId(url) {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Make Sketchfab iframes responsive
   */
  function makeSketchfabResponsive() {
    const sketchfabIframes = document.querySelectorAll('iframe[src*="sketchfab.com"]');

    sketchfabIframes.forEach(function(iframe) {
      // Skip if already wrapped
      if (iframe.parentElement.classList.contains('sketchfab-embed')) {
        return;
      }

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'sketchfab-embed';

      // Wrap the iframe
      iframe.parentNode.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);

      // Remove inline width/height attributes
      iframe.removeAttribute('width');
      iframe.removeAttribute('height');
    });
  }

  /**
   * Fix Vimeo embeds with inline styles
   */
  function fixVimeoInlineStyles() {
    const vimeoContainers = document.querySelectorAll('.wp-block-vimeo-create');

    vimeoContainers.forEach(function(container) {
      const wrapper = document.createElement('div');
      wrapper.className = 'embed-container';

      const iframe = container.querySelector('iframe');
      if (iframe) {
        container.parentNode.insertBefore(wrapper, container);
        wrapper.appendChild(iframe);
        container.remove();
      }
    });
  }

  /**
   * Process Leaflet map shortcodes
   * Converts [leaflet-map] WordPress shortcodes to interactive Leaflet maps
   */
  function processLeafletMaps() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      console.warn('Leaflet.js not loaded, skipping map processing');
      return;
    }

    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    const html = postContent.innerHTML;

    // Match [leaflet-map lat=X lng=Y zoom=Z] pattern
    const leafletPattern = /\[leaflet-map\s+lat=["']?([-\d.]+)["']?\s+lng=["']?([-\d.]+)["']?\s+zoom=["']?(\d+)["']?\]/g;
    let newHtml = html;
    let match;
    let mapCounter = 0;

    while ((match = leafletPattern.exec(html)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      const zoom = parseInt(match[3]);

      // Create unique map ID
      const mapId = 'leaflet-map-' + mapCounter++;

      // Create map container HTML
      const mapContainer = `<div id="${mapId}" class="leaflet-container" style="height: 400px; margin: 20px 0; border-radius: 4px;"></div>`;

      // Replace shortcode with container
      newHtml = newHtml.replace(match[0], mapContainer);

      // Initialize map after DOM update (use setTimeout to ensure element exists)
      setTimeout(function() {
        initializeLeafletMap(mapId, lat, lng, zoom);
      }, 100);
    }

    if (newHtml !== html) {
      postContent.innerHTML = newHtml;
    }
  }

  /**
   * Initialize a Leaflet map with given parameters
   */
  function initializeLeafletMap(mapId, lat, lng, zoom) {
    const mapElement = document.getElementById(mapId);
    if (!mapElement) return;

    try {
      // Create map
      const map = L.map(mapId).setView([lat, lng], zoom);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add marker at the location
      L.marker([lat, lng]).addTo(map)
        .bindPopup('Location')
        .openPopup();

      // Fix map rendering issues
      setTimeout(function() {
        map.invalidateSize();
      }, 100);

    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      mapElement.innerHTML = '<div class="wordpress-embed-placeholder">Map could not be loaded</div>';
    }
  }

  // Run additional fixes after initial processing
  setTimeout(function() {
    fixVimeoInlineStyles();
  }, 100);

})();
