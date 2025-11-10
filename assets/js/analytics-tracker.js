/**
 * Custom Analytics Tracker
 *
 * Lightweight privacy-focused analytics that tracks:
 * - Page views
 * - Session-based unique visitors
 * - Referrers
 * - Browser types
 *
 * No cookies, no personal data, no external services.
 */

(function() {
  'use strict';

  // Don't track if DNT is enabled
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    return;
  }

  // Don't track in admin area
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  // Get or create session ID (stored in sessionStorage, expires when browser closes)
  function getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('analytics_session', sessionId);
    }
    return sessionId;
  }

  // Track page view
  function trackPageView() {
    const data = {
      path: window.location.pathname,
      referrer: document.referrer,
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Send to analytics endpoint
    fetch('/.netlify/functions/analytics-track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(function(error) {
      // Silently fail - analytics shouldn't break the site
      console.debug('Analytics tracking failed:', error);
    });
  }

  // Track on page load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }
})();
