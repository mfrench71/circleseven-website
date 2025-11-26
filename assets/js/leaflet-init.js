/**
 * Leaflet Map Initialization
 * Automatically initializes all maps with class .leaflet-map
 * Reads configuration from data attributes: data-lat, data-lng, data-zoom
 */

(function() {
  'use strict';

  /**
   * Initialize a single map
   * @param {HTMLElement} mapElement - The map container element
   */
  function initializeMap(mapElement) {
    // Get configuration from data attributes
    const lat = parseFloat(mapElement.dataset.lat);
    const lng = parseFloat(mapElement.dataset.lng);
    const zoom = parseInt(mapElement.dataset.zoom) || 13;
    const title = mapElement.dataset.title || 'Location';

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      console.error('[Leaflet] Invalid coordinates for map:', mapElement);
      return;
    }

    // Create map instance
    try {
      const map = L.map(mapElement).setView([lat, lng], zoom);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add marker at the center
      const marker = L.marker([lat, lng]).addTo(map);

      // Add popup if title is provided
      if (title) {
        marker.bindPopup(title);
      }

      console.log(`[Leaflet] Map initialized at ${lat}, ${lng} (zoom: ${zoom})`);
    } catch (error) {
      console.error('[Leaflet] Error initializing map:', error);
    }
  }

  /**
   * Initialize all maps on the page
   */
  function initializeAllMaps() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      console.error('[Leaflet] Leaflet library not loaded');
      return;
    }

    // Find all map elements
    const mapElements = document.querySelectorAll('.leaflet-map');

    if (mapElements.length === 0) {
      console.log('[Leaflet] No maps found on page');
      return;
    }

    // Initialize each map
    mapElements.forEach(mapElement => {
      initializeMap(mapElement);
    });

    console.log(`[Leaflet] Initialized ${mapElements.length} map(s)`);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllMaps);
  } else {
    // DOM already loaded
    initializeAllMaps();
  }

})();
