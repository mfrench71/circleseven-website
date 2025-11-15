/**
 * Enhanced Analytics Module
 *
 * Displays comprehensive website analytics with interactive charts and date filtering.
 * Includes time-series visualization, geographic data, and device breakdowns.
 */

// Module state
let rawAnalyticsData = null;
let currentDateRange = localStorage.getItem('analytics-date-range') || '30d';
let charts = {}; // Store chart instances for updates

/**
 * Loads custom analytics data from the tracking API
 */
export async function loadCustomAnalytics() {
  try {
    const response = await fetch('/.netlify/functions/analytics-track');
    if (!response.ok) {
      throw new Error(`Failed to load analytics: ${response.statusText}`);
    }
    rawAnalyticsData = await response.json();
    return rawAnalyticsData;
  } catch (error) {
    console.error('Failed to load custom analytics:', error);
    return null;
  }
}

/**
 * Filter data by date range
 */
function filterDataByDateRange(data, range) {
  if (!data) return data;

  const now = new Date();
  let startDate;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return filterByDateRange(data, startDate, endDate);
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      return data; // No filtering
  }

  return filterByDateRange(data, startDate, now);
}

/**
 * Filter data between two dates
 */
function filterByDateRange(data, startDate, endDate) {
  const filtered = { ...data };
  const startISO = startDate.toISOString().split('T')[0];
  const endISO = endDate.toISOString().split('T')[0];

  // Filter dailyViews
  if (filtered.dailyViews) {
    filtered.dailyViews = filtered.dailyViews.filter(d => d.date >= startISO && d.date <= endISO);
  }

  // Filter hourlyViews
  if (filtered.hourlyViews) {
    filtered.hourlyViews = filtered.hourlyViews.filter(h => h.hour >= startISO && h.hour <= endISO);
  }

  return filtered;
}

/**
 * Render daily views chart
 */
function renderDailyViewsChart(data) {
  const canvas = document.getElementById('daily-views-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dailyViews = data.dailyViews || [];

  // Destroy existing chart if it exists
  if (charts.daily) {
    charts.daily.destroy();
  }

  charts.daily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dailyViews.map(d => d.date),
      datasets: [{
        label: 'Daily Page Views',
        data: dailyViews.map(d => d.views),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });
}

/**
 * Render hourly views chart
 */
function renderHourlyViewsChart(data) {
  const canvas = document.getElementById('hourly-views-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const hourlyViews = data.hourlyViews || [];

  // Destroy existing chart if it exists
  if (charts.hourly) {
    charts.hourly.destroy();
  }

  charts.hourly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hourlyViews.map(h => h.hour.split(' ')[1] + ':00' || h.hour),
      datasets: [{
        label: 'Hourly Views',
        data: hourlyViews.map(h => h.views),
        backgroundColor: '#198754'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

/**
 * Render browser distribution chart
 */
function renderBrowserChart(data) {
  const canvas = document.getElementById('browser-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const browserStats = data.browserStats || [];

  // Destroy existing chart if it exists
  if (charts.browser) {
    charts.browser.destroy();
  }

  const colors = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107'];

  charts.browser = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: browserStats.map(b => b.browser),
      datasets: [{
        data: browserStats.map(b => b.count),
        backgroundColor: colors.slice(0, browserStats.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * Render device distribution chart
 */
function renderDeviceChart(data) {
  const canvas = document.getElementById('device-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const deviceStats = data.deviceStats || [];

  // Destroy existing chart if it exists
  if (charts.device) {
    charts.device.destroy();
  }

  const colors = ['#198754', '#0dcaf0', '#ffc107'];

  charts.device = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: deviceStats.map(d => d.device),
      datasets: [{
        data: deviceStats.map(d => d.count),
        backgroundColor: colors.slice(0, deviceStats.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * Render all charts
 */
export function renderAllCharts(data) {
  renderDailyViewsChart(data);
  renderHourlyViewsChart(data);
  renderBrowserChart(data);
  renderDeviceChart(data);
}

/**
 * Render date range filter buttons
 */
function renderDateRangeFilter() {
  const ranges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' }
  ];

  return `
    <div class="btn-group btn-group-sm" role="group" aria-label="Date range filter">
      ${ranges.map(range => `
        <button
          type="button"
          class="btn ${currentDateRange === range.value ? 'btn-primary' : 'btn-outline-primary'}"
          onclick="window.changeDateRange('${range.value}')"
        >
          ${range.label}
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Change date range and update display
 */
window.changeDateRange = async function(range) {
  currentDateRange = range;
  localStorage.setItem('analytics-date-range', range);

  // Re-render with filtered data
  const filtered = filterDataByDateRange(rawAnalyticsData, range);

  // Update charts
  renderAllCharts(filtered);

  // Update the filter buttons
  const container = document.querySelector('.date-range-filter');
  if (container) {
    container.innerHTML = renderDateRangeFilter();
  }
};

/**
 * Render geographic data (countries and cities)
 */
function renderGeographicData(data) {
  const countryStats = data.countryStats || [];
  const cityStats = data.cityStats || [];

  if (countryStats.length === 0 && cityStats.length === 0) {
    return `
      <div class="alert alert-warning mb-0">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Geographic data unavailable</strong><br>
        <small>Geographic tracking requires Netlify Pro plan or higher. Your current plan does not provide geo-location headers.</small>
      </div>
    `;
  }

  return `
    <div class="row g-3">
      ${countryStats.length > 0 ? `
        <div class="col-md-6">
          <h6 class="small text-uppercase text-muted mb-2">Top Countries</h6>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 small">
              <tbody>
                ${countryStats.slice(0, 10).map(country => `
                  <tr>
                    <td>${country.country}</td>
                    <td class="text-end"><span class="badge bg-primary">${country.count}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${cityStats.length > 0 ? `
        <div class="col-md-6">
          <h6 class="small text-uppercase text-muted mb-2">Top Cities</h6>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 small">
              <tbody>
                ${cityStats.slice(0, 10).map(city => `
                  <tr>
                    <td>${city.city}</td>
                    <td class="text-end"><span class="badge bg-success">${city.count}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Renders enhanced custom analytics with charts
 */
export function renderCustomAnalytics(data) {
  if (!data) {
    return `
      <div class="alert alert-info mb-0">
        <i class="fas fa-info-circle me-2"></i>
        Analytics tracking is enabled. Data will appear once visitors view pages.
      </div>
    `;
  }

  const { summary, topPages, topReferrers, deviceStats, countryStats, cityStats } = data;

  // Calculate views in last hour
  const viewsLastHour = (data.hourlyViews || []).slice(-1)[0]?.views || 0;

  return `
    <div class="mb-4">
      <!-- Date Range Filter -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0"><i class="fas fa-chart-line me-2"></i>Analytics Overview</h6>
        <div class="date-range-filter">
          ${renderDateRangeFilter()}
        </div>
      </div>

      <!-- Summary Stats (Compact) -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body py-3">
              <div class="text-primary mb-1"><i class="fas fa-eye"></i> Page Views</div>
              <h4 class="mb-0">${summary.totalPageViews.toLocaleString()}</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body py-3">
              <div class="text-success mb-1"><i class="fas fa-users"></i> Visitors</div>
              <h4 class="mb-0">${summary.uniqueVisitors.toLocaleString()}</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body py-3">
              <div class="text-info mb-1"><i class="fas fa-file-alt"></i> Pages</div>
              <h4 class="mb-0">${summary.totalPages.toLocaleString()}</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body py-3">
              <div class="text-warning mb-1"><i class="fas fa-clock"></i> Last Hour</div>
              <h4 class="mb-0">${viewsLastHour}</h4>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row g-3 mb-4">
        <!-- Daily Views Chart -->
        <div class="col-md-8">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-chart-area me-2"></i>Daily Page Views</h6>
            </div>
            <div class="card-body">
              <div style="height: 250px;">
                <canvas id="daily-views-chart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Hourly Views Chart -->
        <div class="col-md-4">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Hourly Pattern</h6>
            </div>
            <div class="card-body">
              <div style="height: 250px;">
                <canvas id="hourly-views-chart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Browser & Device Charts Row -->
      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-browser me-2"></i>Browsers</h6>
            </div>
            <div class="card-body">
              <div style="height: 200px;">
                <canvas id="browser-chart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-mobile-alt me-2"></i>Devices</h6>
            </div>
            <div class="card-body">
              <div style="height: 200px;">
                <canvas id="device-chart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Geographic Data -->
      <div class="card mb-4">
        <div class="card-header py-2">
          <h6 class="mb-0"><i class="fas fa-globe me-2"></i>Geographic Data</h6>
        </div>
        <div class="card-body p-3">
          ${renderGeographicData(data)}
        </div>
      </div>

      <!-- Top Pages & Referrers (Compact) -->
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-trophy me-2"></i>Top Pages</h6>
            </div>
            <div class="card-body p-2">
              ${topPages.length > 0 ? `
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 small">
                    <tbody>
                      ${topPages.slice(0, 10).map(page => `
                        <tr>
                          <td><a href="${page.path}" target="_blank" rel="noopener" class="text-decoration-none small">${page.path}</a></td>
                          <td class="text-end"><span class="badge bg-primary">${page.views}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p class="text-muted mb-0 small">No data yet</p>'}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header py-2">
              <h6 class="mb-0"><i class="fas fa-external-link-alt me-2"></i>Top Referrers</h6>
            </div>
            <div class="card-body p-2">
              ${topReferrers.length > 0 ? `
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 small">
                    <tbody>
                      ${topReferrers.slice(0, 10).map(ref => `
                        <tr>
                          <td class="small">${ref.referrer}</td>
                          <td class="text-end"><span class="badge bg-success">${ref.count}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p class="text-muted mb-0 small">No external referrers</p>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Session Stats & Info Row -->
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body py-2">
              <div class="d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="fas fa-layer-group me-1"></i>Avg Pages/Session:</span>
                <strong>${summary.avgPagesPerSession}</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-body py-2">
              <div class="d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="fas fa-clock me-1"></i>Active Sessions:</span>
                <strong>${summary.activeSessions}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Purge & Info Row -->
      <div class="d-flex justify-content-between align-items-center">
        <p class="text-muted small mb-0">
          <i class="fas fa-info-circle me-1"></i>
          Privacy-friendly analytics. Since: ${new Date(summary.lastReset).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        <button onclick="purgeAnalytics()" class="btn btn-sm btn-outline-danger">
          <i class="fas fa-trash-alt me-1"></i>Purge Data
        </button>
      </div>
    </div>
  `;
}

/**
 * Purge analytics data
 */
window.purgeAnalytics = async function() {
  if (!confirm('Are you sure you want to permanently delete all analytics data? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('/.netlify/functions/analytics-track', {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to purge analytics data');
    }

    // Show success message
    if (typeof window.showSuccess === 'function') {
      window.showSuccess('Analytics data purged successfully!');
    } else {
      alert('Analytics data purged successfully!');
    }

    // Reload the page to show empty stats
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('Failed to purge analytics:', error);
    if (typeof window.showError === 'function') {
      window.showError('Failed to purge analytics: ' + error.message);
    } else {
      alert('Failed to purge analytics: ' + error.message);
    }
  }
};

/**
 * Loads content health data from the API
 */
export async function loadContentHealth() {
  const cacheKey = 'contentHealth';
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Check cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < cacheExpiry) {
      return data;
    }
  }

  // Fetch fresh data
  const response = await fetch('/.netlify/functions/content-health');
  if (!response.ok) {
    throw new Error(`Failed to load content health: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the result
  localStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}

/**
 * Renders content health overview card
 */
export function renderHealthOverview(data) {
  const healthPercentage = data.total > 0
    ? Math.round((data.healthy / data.total) * 100)
    : 100;

  return `
    <div class="row mb-4">
      <div class="col-md-4">
        <div class="card text-center">
          <div class="card-body">
            <h5 class="card-title">Total Posts</h5>
            <p class="display-4">${data.total}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card text-center text-bg-success">
          <div class="card-body">
            <h5 class="card-title">Healthy Posts</h5>
            <p class="display-4">${data.healthy}</p>
            <small>${healthPercentage}% of total</small>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card text-center ${data.withIssues > 0 ? 'text-bg-warning' : ''}">
          <div class="card-body">
            <h5 class="card-title">Posts with Issues</h5>
            <p class="display-4">${data.withIssues}</p>
            <small>${data.total > 0 ? Math.round((data.withIssues / data.total) * 100) : 0}% of total</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders issue statistics
 */
export function renderIssueStats(data) {
  const issueTypes = [
    { key: 'no_featured_image', label: 'Missing Featured Image', icon: 'fa-image' },
    { key: 'no_categories', label: 'No Categories', icon: 'fa-folder' },
    { key: 'no_tags', label: 'No Tags', icon: 'fa-tags' },
    { key: 'no_excerpt', label: 'No Excerpt', icon: 'fa-file-lines' },
    { key: 'short_content', label: 'Short Content', icon: 'fa-text-height' }
  ];

  const rows = issueTypes.map(type => {
    const count = data.issuesByType[type.key] || 0;
    const percentage = data.total > 0 ? Math.round((count / data.total) * 100) : 0;

    return `
      <tr>
        <td><i class="fas ${type.icon} me-2"></i>${type.label}</td>
        <td class="text-end">${count}</td>
        <td class="text-end">${percentage}%</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Issue Statistics</h5>
      </div>
      <div class="card-body">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Issue Type</th>
              <th class="text-end">Count</th>
              <th class="text-end">% of Posts</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renders list of posts with issues
 */
export function renderPostsWithIssues(data) {
  const postsToShow = data.posts.filter(p => p.issueCount > 0).slice(0, 20);

  if (postsToShow.length === 0) {
    return `
      <div class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>
        All posts are healthy! No issues found.
      </div>
    `;
  }

  const rows = postsToShow.map(post => {
    const issuesList = post.issues.map(issue => {
      const badgeClass = issue.severity === 'warning' ? 'bg-warning' : 'bg-info';
      return `<span class="badge ${badgeClass} me-1">${issue.message}</span>`;
    }).join('');

    return `
      <tr>
        <td>
          <strong>${post.title}</strong><br>
          <small class="text-muted">${post.filename}</small>
        </td>
        <td class="text-center">
          <span class="badge bg-secondary">${post.issueCount}</span>
        </td>
        <td>
          ${issuesList}
        </td>
        <td class="text-center">
          <a href="/admin/posts/?file=${encodeURIComponent(post.slug)}"
             class="btn btn-sm btn-primary">
            <i class="fas fa-edit"></i> Edit
          </a>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Posts Needing Attention</h5>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Post</th>
                <th class="text-center">Issues</th>
                <th>Details</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
        ${data.withIssues > 20 ? `<p class="text-muted mt-3 mb-0"><small>Showing top 20 posts with issues (${data.withIssues} total)</small></p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Main render function for the analytics page
 */
export async function renderAnalytics(container) {
  try {
    container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading analytics...</p></div>';

    // Load both custom analytics and content health in parallel
    const [customAnalytics, contentHealth] = await Promise.all([
      loadCustomAnalytics(),
      loadContentHealth()
    ]);

    // Filter data by current date range
    const filteredData = filterDataByDateRange(customAnalytics, currentDateRange);

    const html = `
      <div class="analytics-page">
        <!-- Website Analytics Section -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0"><i class="fas fa-chart-line me-2"></i>Website Analytics</h3>
          </div>
          <div class="card-body">
            ${renderCustomAnalytics(filteredData)}
          </div>
        </div>

        <!-- Content Health Section -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0"><i class="fas fa-heart-pulse me-2"></i>Content Health</h3>
          </div>
          <div class="card-body">
            ${renderHealthOverview(contentHealth)}
            ${renderIssueStats(contentHealth)}
            ${renderPostsWithIssues(contentHealth)}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Render charts after DOM is ready (need to wait for canvas elements)
    setTimeout(() => {
      renderAllCharts(filteredData);
    }, 100);

  } catch (error) {
    console.error('Error rendering analytics:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <h4 class="alert-heading">Error Loading Analytics</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}
