/**
 * Analytics Module
 * Displays content health metrics for the site
 */

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
 * Renders Plausible analytics embed section
 */
export function renderPlausibleStats() {
  // Get plausible domain from site config
  const plausibleDomain = window.siteConfig?.plausible_domain;

  if (!plausibleDomain) {
    return `
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i>Website Analytics (Plausible)</h5>
        </div>
        <div class="card-body">
          <div class="alert alert-info mb-0">
            <i class="fas fa-info-circle me-2"></i>
            Plausible analytics is not configured. Add <code>plausible_domain</code> to your <code>_config.yml</code> to enable website analytics.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i>Website Analytics (Plausible)</h5>
        <a href="https://plausible.io/${plausibleDomain}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">
          <i class="fas fa-external-link-alt me-1"></i>Open Full Dashboard
        </a>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          To embed live Plausible stats here, you need to generate a shared link in your Plausible dashboard:
          <ol class="mb-0 mt-2">
            <li>Go to <a href="https://plausible.io/${plausibleDomain}/settings/visibility" target="_blank" rel="noopener">Site Settings → Visibility</a></li>
            <li>Generate a shared link (this makes stats publicly accessible but unindexed)</li>
            <li>Copy the shared link and add it to your admin settings</li>
          </ol>
        </div>
        <div class="text-center py-4">
          <a href="https://plausible.io/${plausibleDomain}" target="_blank" rel="noopener" class="btn btn-primary">
            <i class="fas fa-chart-bar me-2"></i>View Plausible Dashboard
          </a>
        </div>
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

    const data = await loadContentHealth();

    const html = `
      <div class="analytics-page">
        <h2 class="mb-4">Analytics</h2>

        ${renderPlausibleStats()}

        <h3 class="h5 mb-3 mt-4">Content Health</h3>
        ${renderHealthOverview(data)}
        ${renderIssueStats(data)}
        ${renderPostsWithIssues(data)}
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
