/**
 * Analytics Module
 * Displays both custom website analytics and content health metrics
 */

/**
 * Loads custom analytics data from the tracking API
 */
export async function loadCustomAnalytics() {
  try {
    const response = await fetch('/.netlify/functions/analytics-track');
    if (!response.ok) {
      throw new Error(`Failed to load analytics: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load custom analytics:', error);
    return null;
  }
}

/**
 * Renders custom analytics overview - compact version
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

  const { summary, topPages, topReferrers, browserStats } = data;

  return `
    <div class="mb-4">
      <!-- Summary Stats (Compact) -->
      <div class="row g-3 mb-3">
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
              <div class="text-warning mb-1"><i class="fas fa-chart-line"></i> Avg/Page</div>
              <h4 class="mb-0">${summary.totalPages > 0 ? Math.round(summary.totalPageViews / summary.totalPages) : 0}</h4>
            </div>
          </div>
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
                      ${topPages.slice(0, 5).map(page => `
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
                      ${topReferrers.slice(0, 5).map(ref => `
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

      <!-- Browser Stats (Compact) -->
      <div class="card mb-3">
        <div class="card-header py-2">
          <h6 class="mb-0"><i class="fas fa-browser me-2"></i>Browsers</h6>
        </div>
        <div class="card-body p-2">
          ${browserStats.length > 0 ? `
            <div class="d-flex gap-3 flex-wrap">
              ${browserStats.map(browser => {
                const percentage = summary.totalPageViews > 0 ? Math.round((browser.count / summary.totalPageViews) * 100) : 0;
                return `
                  <div class="flex-fill" style="min-width: 100px;">
                    <div class="d-flex justify-content-between small mb-1">
                      <span>${browser.browser}</span>
                      <strong>${percentage}%</strong>
                    </div>
                    <div class="progress" style="height: 6px;">
                      <div class="progress-bar bg-info" style="width: ${percentage}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<p class="text-muted mb-0 small">No browser data yet</p>'}
        </div>
      </div>

      <!-- Purge & Info Row -->
      <div class="d-flex justify-content-between align-items-center">
        <p class="text-muted small mb-0">
          <i class="fas fa-info-circle me-1"></i>
          Data stored in Netlify Blobs. Since: ${new Date(summary.lastReset).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
    container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p class="mt-2">Loading analytics...</p></div>';

    // Load both custom analytics and content health in parallel
    const [customAnalytics, contentHealth] = await Promise.all([
      loadCustomAnalytics(),
      loadContentHealth()
    ]);

    const html = `
      <div class="analytics-page">
        <!-- Website Analytics Section -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0"><i class="fas fa-chart-line me-2"></i>Website Analytics</h3>
          </div>
          <div class="card-body">
            ${renderCustomAnalytics(customAnalytics)}
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
