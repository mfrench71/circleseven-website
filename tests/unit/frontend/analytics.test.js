/**
 * Unit tests for analytics module
 * Tests rendering of analytics data, especially geodata which was previously broken
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderCustomAnalytics } from '../../../admin/js/modules/analytics.js';

// Mock Chart.js
global.Chart = vi.fn();

describe('Analytics Module', () => {
  describe('renderCustomAnalytics', () => {
    it('returns info message when no data provided', () => {
      const html = renderCustomAnalytics(null);

      expect(html).toContain('alert-info');
      expect(html).toContain('Analytics tracking is enabled');
      expect(html).toContain('Data will appear once visitors view pages');
    });

    it('renders basic analytics data without geodata', () => {
      const data = {
        summary: {
          totalPageViews: 100,
          uniqueVisitors: 50,
          totalPages: 10,
          avgPagesPerSession: 2.5,
          activeSessions: 5
        },
        topPages: [
          { path: '/blog/', views: 25 },
          { path: '/about/', views: 15 }
        ],
        topReferrers: [
          { referrer: 'google.com', count: 30 },
          { referrer: 'twitter.com', count: 10 }
        ],
        deviceStats: [
          { device: 'Desktop', count: 60 },
          { device: 'Mobile', count: 40 }
        ],
        countryStats: [],
        cityStats: [],
        dailyViews: [
          { date: '2024-01-01', views: 50 },
          { date: '2024-01-02', views: 50 }
        ],
        hourlyViews: [
          { hour: '2024-01-01 10', views: 10 }
        ]
      };

      const html = renderCustomAnalytics(data);

      // Should contain summary stats
      expect(html).toContain('100'); // Total page views
      expect(html).toContain('50'); // Unique visitors
      expect(html).toContain('10'); // Total pages

      // Should contain top pages
      expect(html).toContain('/blog/');
      expect(html).toContain('/about/');

      // Should contain referrers
      expect(html).toContain('google.com');
      expect(html).toContain('twitter.com');

      // Should contain geographic section even with no data
      expect(html).toContain('Geographic Data');
      expect(html).toContain('Geographic data will appear');
    });

    it('renders geodata when countryStats and cityStats are present', () => {
      const data = {
        summary: {
          totalPageViews: 100,
          uniqueVisitors: 50,
          totalPages: 10,
          avgPagesPerSession: 2.0,
          activeSessions: 5
        },
        topPages: [],
        topReferrers: [],
        deviceStats: [
          { device: 'Desktop', count: 100 }
        ],
        countryStats: [
          { country: 'United States', count: 50 },
          { country: 'United Kingdom', count: 25 },
          { country: 'Canada', count: 15 }
        ],
        cityStats: [
          { city: 'London', count: 15 },
          { city: 'New York', count: 10 },
          { city: 'Toronto', count: 8 }
        ],
        dailyViews: [],
        hourlyViews: []
      };

      const html = renderCustomAnalytics(data);

      // Should contain geographic data section
      expect(html).toContain('Geographic Data');

      // Should contain country data
      expect(html).toContain('United States');
      expect(html).toContain('United Kingdom');
      expect(html).toContain('Canada');

      // Should contain city data
      expect(html).toContain('London');
      expect(html).toContain('New York');
      expect(html).toContain('Toronto');

      // Should NOT show placeholder message when data exists
      expect(html).not.toContain('Geographic data will appear');

      // Should have proper table structure
      expect(html).toContain('Top Countries');
      expect(html).toContain('Top Cities');
    });

    it('shows placeholder when geodata arrays are empty', () => {
      const data = {
        summary: {
          totalPageViews: 10,
          uniqueVisitors: 5,
          totalPages: 2,
          avgPagesPerSession: 2.0,
          activeSessions: 1
        },
        topPages: [],
        topReferrers: [],
        deviceStats: [],
        countryStats: [],
        cityStats: [],
        dailyViews: [],
        hourlyViews: []
      };

      const html = renderCustomAnalytics(data);

      // Should show placeholder when no geodata
      expect(html).toContain('Geographic data will appear');

      // Should NOT show country/city tables
      expect(html).not.toContain('Top Countries');
      expect(html).not.toContain('Top Cities');
    });

    it('handles partial geodata (only countries)', () => {
      const data = {
        summary: {
          totalPageViews: 10,
          uniqueVisitors: 5,
          totalPages: 2,
          avgPagesPerSession: 2.0,
          activeSessions: 1
        },
        topPages: [],
        topReferrers: [],
        deviceStats: [],
        countryStats: [
          { country: 'Germany', count: 10 }
        ],
        cityStats: [],
        dailyViews: [],
        hourlyViews: []
      };

      const html = renderCustomAnalytics(data);

      // Should show countries
      expect(html).toContain('Germany');
      expect(html).toContain('Top Countries');

      // Should NOT show cities table
      expect(html).not.toContain('Top Cities');

      // Should NOT show placeholder
      expect(html).not.toContain('Geographic data will appear');
    });

    it('handles partial geodata (only cities)', () => {
      const data = {
        summary: {
          totalPageViews: 10,
          uniqueVisitors: 5,
          totalPages: 2,
          avgPagesPerSession: 2.0,
          activeSessions: 1
        },
        topPages: [],
        topReferrers: [],
        deviceStats: [],
        countryStats: [],
        cityStats: [
          { city: 'Berlin', count: 10 }
        ],
        dailyViews: [],
        hourlyViews: []
      };

      const html = renderCustomAnalytics(data);

      // Should show cities
      expect(html).toContain('Berlin');
      expect(html).toContain('Top Cities');

      // Should NOT show countries table
      expect(html).not.toContain('Top Countries');

      // Should NOT show placeholder
      expect(html).not.toContain('Geographic data will appear');
    });

    it('limits geodata to top 10 entries', () => {
      const countryStats = [];
      const cityStats = [];

      // Create 15 countries and cities
      for (let i = 1; i <= 15; i++) {
        countryStats.push({ country: `Country${i}`, count: 100 - i });
        cityStats.push({ city: `City${i}`, count: 100 - i });
      }

      const data = {
        summary: {
          totalPageViews: 1000,
          uniqueVisitors: 500,
          totalPages: 50,
          avgPagesPerSession: 2.0,
          activeSessions: 10
        },
        topPages: [],
        topReferrers: [],
        deviceStats: [],
        countryStats,
        cityStats,
        dailyViews: [],
        hourlyViews: []
      };

      const html = renderCustomAnalytics(data);

      // Should contain first 10 countries
      for (let i = 1; i <= 10; i++) {
        expect(html).toContain(`Country${i}`);
      }

      // Should NOT contain 11-15
      for (let i = 11; i <= 15; i++) {
        expect(html).not.toContain(`Country${i}`);
      }

      // Same for cities
      for (let i = 1; i <= 10; i++) {
        expect(html).toContain(`City${i}`);
      }

      for (let i = 11; i <= 15; i++) {
        expect(html).not.toContain(`City${i}`);
      }
    });

    it('includes all required sections in output', () => {
      const data = {
        summary: {
          totalPageViews: 100,
          uniqueVisitors: 50,
          totalPages: 10,
          avgPagesPerSession: 2.0,
          activeSessions: 5
        },
        topPages: [{ path: '/test/', views: 10 }],
        topReferrers: [{ referrer: 'google.com', count: 5 }],
        deviceStats: [{ device: 'Desktop', count: 60 }],
        countryStats: [{ country: 'USA', count: 50 }],
        cityStats: [{ city: 'NYC', count: 25 }],
        dailyViews: [{ date: '2024-01-01', views: 100 }],
        hourlyViews: [{ hour: '2024-01-01 10', views: 10 }]
      };

      const html = renderCustomAnalytics(data);

      // Should have all major sections
      expect(html).toContain('Analytics Overview');
      expect(html).toContain('Page Views');
      expect(html).toContain('Visitors');
      expect(html).toContain('Daily Page Views');
      expect(html).toContain('Hourly Pattern');
      expect(html).toContain('Browsers');
      expect(html).toContain('Devices');
      expect(html).toContain('Geographic Data');
      expect(html).toContain('Top Pages');
      expect(html).toContain('Top Referrers');

      // Should have chart canvas elements
      expect(html).toContain('id="daily-views-chart"');
      expect(html).toContain('id="hourly-views-chart"');
      expect(html).toContain('id="browser-chart"');
      expect(html).toContain('id="device-chart"');
    });
  });
});
