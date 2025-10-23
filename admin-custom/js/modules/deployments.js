/**
 * Deployments Module
 *
 * GitHub Actions deployment tracking and status monitoring
 *
 * Features:
 * - Track active deployments with SHA and action
 * - Poll GitHub Actions for deployment status
 * - Display deployment banner with live updates
 * - Maintain deployment history in localStorage
 * - Dashboard deployment history card
 * - Auto-reload affected content on completion
 *
 * Dependencies:
 * - core/utils.js (escapeHtml)
 * - Global constants: API_BASE, DEPLOYMENT_STATUS_POLL_INTERVAL, DEPLOYMENT_HISTORY_POLL_INTERVAL, DEPLOYMENT_TIMEOUT
 * - Global state: activeDeployments, deploymentPollInterval, historyPollInterval
 * - Other modules: loadPosts(), loadPages(), loadTrash()
 */

import { escapeHtml } from '../core/utils.js';

const MAX_DEPLOYMENT_HISTORY = 50; // Keep last 50 deployments

/**
 * Loads deployment history from localStorage
 *
 * Retrieves and parses the stored deployment history.
 *
 * @returns {Array} Array of deployment objects
 */
export function loadDeploymentHistory() {
  try {
    const stored = localStorage.getItem('deploymentHistory');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load deployment history:', error);
    return [];
  }
}

/**
 * Fetches recent GitHub Actions workflow runs
 *
 * Queries the GitHub API for recent deployments and returns the list.
 *
 * @returns {Promise<Array>} Array of recent deployments
 *
 * @throws {Error} If GitHub API request fails
 */
export async function fetchRecentDeploymentsFromGitHub() {
  try {
    const response = await fetch(`${window.API_BASE}/deployment-history`);
    if (!response.ok) {
      console.warn('Deployment history endpoint not available yet:', response.status);
      return [];
    }

    const data = await response.json();
    return data.deployments || [];
  } catch (error) {
    console.warn('Failed to fetch deployment history from GitHub (will retry):', error.message);
    return [];
  }
}

/**
 * Gets deployment history, merging localStorage with GitHub data
 *
 * Fetches from GitHub if stale, merges with local history, and limits to most recent deployments.
 *
 * @returns {Promise<Array>} Array of deployment objects
 */
export async function getDeploymentHistory() {
  const localHistory = loadDeploymentHistory();
  const githubHistory = await fetchRecentDeploymentsFromGitHub();

  // Create a map of GitHub deployments by commitSha for quick lookup
  const githubMap = new Map(githubHistory.map(d => [d.commitSha, d]));

  // Merge: prioritize GitHub status over localStorage (GitHub is source of truth)
  const merged = localHistory.map(localDep => {
    const githubDep = githubMap.get(localDep.commitSha);
    if (githubDep) {
      // GitHub has this deployment - use GitHub's status (more current)
      githubMap.delete(localDep.commitSha); // Remove from map so we don't add it again
      return githubDep;
    }
    // No GitHub record - keep local (might be old/archived)
    return localDep;
  });

  // Add any remaining GitHub deployments that weren't in localStorage
  githubMap.forEach(deployment => {
    merged.push(deployment);
  });

  // Sort by completedAt/startedAt (most recent first)
  merged.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt));

  return merged;
}

/**
 * Saves deployment history to localStorage
 *
 * Persists the deployment history array and update timestamp.
 *
 * @param {Array} history - Deployment history array to save
 */
export function saveDeploymentHistory(history) {
  try {
    // Auto-archive: keep only the most recent MAX_DEPLOYMENT_HISTORY items
    const trimmed = history.slice(-MAX_DEPLOYMENT_HISTORY);
    localStorage.setItem('deploymentHistory', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save deployment history:', error);
  }
}

/**
 * Adds a new deployment to history
 *
 * Prepends the deployment to history, removes duplicates, limits to 50 items, and persists.
 *
 * @param {Object} deployment - Deployment object to add
 */
export function addToDeploymentHistory(deployment) {
  const history = loadDeploymentHistory();
  history.push({
    commitSha: deployment.commitSha,
    action: deployment.action,
    itemId: deployment.itemId,
    status: deployment.status,
    startedAt: deployment.startedAt,
    completedAt: new Date(),
    duration: Math.floor((new Date() - new Date(deployment.startedAt)) / 1000)
  });
  saveDeploymentHistory(history);
  updateDashboardDeployments(); // Refresh display
}

/**
 * Restores in-progress deployments from GitHub on page load
 *
 * Queries GitHub for currently running workflows and adds them to active deployments.
 *
 * @returns {Promise<void>}
 */
export async function restoreActiveDeployments() {
  try {
    // Initialize array if not exists
    if (!window.activeDeployments) {
      window.activeDeployments = [];
    }

    const githubDeployments = await fetchRecentDeploymentsFromGitHub();

    // Find any in-progress deployments
    const inProgressDeployments = githubDeployments.filter(d =>
      d.status === 'pending' || d.status === 'queued' || d.status === 'in_progress'
    );

    if (inProgressDeployments.length > 0) {
      // Add them to activeDeployments (converting GitHub format to our format)
      inProgressDeployments.forEach(deployment => {
        window.activeDeployments.push({
          commitSha: deployment.commitSha,
          action: deployment.action,
          itemId: deployment.itemId || null,
          startedAt: new Date(deployment.startedAt),
          status: deployment.status
        });
      });

      // Show banner and start polling if we have active deployments
      if (window.activeDeployments.length > 0) {
        showDeploymentBanner();
        startDeploymentPolling();
      }
    }
  } catch (error) {
    console.error('Failed to restore active deployments:', error);
  }
}

/**
 * Tracks a new deployment
 *
 * Adds deployment to active tracking, shows deployment banner, and adds to history.
 *
 * @param {string} commitSha - Git commit SHA
 * @param {string} action - Description of the action
 * @param {string} [itemId=null] - Optional item identifier
 */
export function trackDeployment(commitSha, action, itemId = null) {
  if (!commitSha) return;

  // Initialize array if not exists
  if (!window.activeDeployments) {
    window.activeDeployments = [];
  }

  window.activeDeployments.push({
    commitSha,
    action,
    itemId, // Track which item this deployment is for (e.g., filename)
    startedAt: new Date(),
    status: 'pending'
  });

  showDeploymentBanner();
  startDeploymentPolling();
  updateDashboardDeployments();
}

/**
 * Shows the deployment status banner
 *
 * Displays the banner with deployment progress information.
 */
export function showDeploymentBanner() {
  const header = document.getElementById('deployment-status-header');

  if (header) {
    header.classList.remove('hidden');
    updateDeploymentBanner();
  } else {
    console.error('deployment-status-header element not found in DOM!');
  }
}

/**
 * Updates the deployment banner with current status
 *
 * Refreshes the banner content based on active deployments.
 */
export function updateDeploymentBanner() {
  const messageEl = document.getElementById('deployment-status-message');
  const timeEl = document.getElementById('deployment-status-time');

  if (!window.activeDeployments || window.activeDeployments.length === 0) return;

  const oldest = window.activeDeployments[0];
  const elapsed = Math.floor((new Date() - oldest.startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (messageEl) {
    const count = window.activeDeployments.length;
    const action = oldest.action || 'changes';
    if (count === 1) {
      messageEl.textContent = `Publishing: ${action}`;
    } else {
      messageEl.textContent = `Publishing ${count} changes to GitHub Pages`;
    }
  }

  if (timeEl) {
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Shows deployment completion message
 *
 * Displays success or failure message in the banner.
 * Automatically reloads posts/pages lists if deployments affected them.
 *
 * @param {boolean} [success=true] - Whether deployment succeeded
 * @param {Array<Object>} [completedDeployments=[]] - Array of completed deployment objects
 */
export function showDeploymentCompletion(success = true, completedDeployments = []) {
  const header = document.getElementById('deployment-status-header');
  const messageEl = document.getElementById('deployment-status-message');
  const timeEl = document.getElementById('deployment-status-time');
  const iconEl = header?.querySelector('i');

  if (!header) return;

  // Update banner styling
  if (success) {
    header.className = 'bg-gradient-to-r from-green-500 to-green-600 text-white';
  } else {
    header.className = 'bg-gradient-to-r from-red-500 to-red-600 text-white';
  }

  // Update icon
  if (iconEl) {
    iconEl.className = success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  }

  // Update message
  if (messageEl) {
    messageEl.textContent = success
      ? 'Changes published successfully!'
      : 'Deployment failed';
  }

  // Hide time
  if (timeEl) {
    timeEl.style.display = 'none';
  }

  // Auto-reload affected lists when deployment succeeds
  if (success && completedDeployments.length > 0) {
    const hasPostChanges = completedDeployments.some(d =>
      d.action && d.action.toLowerCase().includes('post')
    );
    const hasPageChanges = completedDeployments.some(d =>
      d.action && d.action.toLowerCase().includes('page')
    );

    // Reload posts list if any post-related deployments completed
    if (hasPostChanges && typeof window.loadPosts === 'function') {
      window.loadPosts();
    }

    // Reload pages list if any page-related deployments completed
    if (hasPageChanges && typeof window.loadPages === 'function') {
      window.loadPages();
    }

    // Reload trash list if restore/delete operations completed
    const hasTrashChanges = completedDeployments.some(d =>
      d.action && (d.action.toLowerCase().includes('restore') || d.action.toLowerCase().includes('delete'))
    );
    if (hasTrashChanges && typeof window.loadTrash === 'function') {
      window.loadTrash();
    }
  }

  // Auto-hide after 5 seconds for success, 8 seconds for failure
  const hideDelay = success ? 5000 : 8000;
  setTimeout(() => {
    hideDeploymentBanner();
  }, hideDelay);
}

/**
 * Hides the deployment status banner
 *
 * Removes the banner from view with fade-out animation.
 */
export function hideDeploymentBanner() {
  const header = document.getElementById('deployment-status-header');
  const timeEl = document.getElementById('deployment-status-time');

  if (header) {
    header.classList.add('hidden');
    // Reset to default styling
    header.className = 'hidden bg-gradient-to-r from-teal-500 to-teal-600 text-white animate-gradient-pulse';

    // Reset icon
    const iconEl = header.querySelector('i');
    if (iconEl) {
      iconEl.className = 'fas fa-spinner fa-spin';
    }

    // Show time again
    if (timeEl) {
      timeEl.style.display = '';
    }
  }
}

/**
 * Updates the deployment history display on dashboard
 *
 * Fetches recent deployments and renders them in the dashboard widget.
 *
 * @returns {Promise<void>}
 */
export async function updateDashboardDeployments() {
  const card = document.getElementById('deployments-card');
  if (!card) return; // Not on dashboard

  // Hide loading spinner and show content
  const loadingEl = document.getElementById('deployments-loading');
  const contentEl = document.getElementById('deployments-content');

  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');

  const cardContent = contentEl || card.querySelector('.card-content');
  if (!cardContent) return;

  // Get deployment history
  const history = await getDeploymentHistory();
  const recentHistory = history.slice(0, 10); // Show last 10

  // Initialize array if not exists
  if (!window.activeDeployments) {
    window.activeDeployments = [];
  }

  // Get commit SHAs of active deployments to avoid duplicates
  const activeShas = new Set(window.activeDeployments.map(d => d.commitSha));

  // Combine active and history for table display
  // Show: active deployments + all non-skipped/cancelled from history (excluding duplicates)
  const mainDeployments = [
    ...window.activeDeployments.map(d => ({ ...d, isActive: true })),
    ...recentHistory
      .filter(d =>
        !activeShas.has(d.commitSha) && // Not already in active deployments
        d.status !== 'skipped' &&
        d.status !== 'cancelled'
      )
      .map(d => ({ ...d, isActive: false }))
  ];

  // Separate skipped/cancelled for collapsible section
  const hiddenDeployments = recentHistory.filter(d => d.status === 'skipped' || d.status === 'cancelled');

  // Show empty state if no deployments at all
  if (mainDeployments.length === 0 && hiddenDeployments.length === 0) {
    cardContent.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-rocket text-4xl mb-2 text-gray-400"></i>
        <p>No deployments yet</p>
        <p class="text-sm mt-1">Make a change to see deployment history</p>
      </div>
    `;
    return;
  }

  // Build compact table
  let html = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deployed</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
  `;

  mainDeployments.forEach((deployment, index) => {
    let statusIcon, statusColor, statusText, rowBg;

    if (deployment.isActive) {
      // Active deployments
      let animationClass = '';

      if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        rowBg = 'bg-blue-100';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
        rowBg = 'bg-yellow-50';
      } else {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
        rowBg = 'bg-gray-50';
      }

      const elapsed = Math.floor((new Date() - new Date(deployment.startedAt)) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      html += `
        <tr class="${rowBg} ${animationClass} text-xs">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${timeStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">live</td>
        </tr>
      `;
    } else {
      // Historical deployments (from GitHub)
      let animationClass = '';

      // Check if deployment completed recently (within last 30 seconds)
      const isRecentSuccess = deployment.status === 'completed' &&
        deployment.completedAt &&
        (Date.now() - new Date(deployment.completedAt).getTime()) < 30000;

      if (deployment.status === 'completed') {
        statusIcon = 'fa-check-circle';
        statusColor = 'text-green-600';
        statusText = 'Success';
        // First row: show green background if recent, white if old
        // Other rows: alternating white/gray
        if (index === 0 && isRecentSuccess) {
          rowBg = 'bg-green-50 transition-colors duration-1000';
        } else {
          rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        }
      } else if (deployment.status === 'failed') {
        statusIcon = 'fa-times-circle';
        statusColor = 'text-red-600';
        statusText = 'Failed';
        // First row: show red background to highlight failure
        // Other rows: alternating white/gray
        rowBg = index === 0 ? 'bg-red-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50');
      } else if (deployment.status === 'in_progress') {
        statusIcon = 'fa-spinner fa-spin';
        statusColor = 'text-blue-600';
        statusText = 'Deploying';
        rowBg = index === 0 ? 'bg-blue-100' : 'bg-blue-50';
        animationClass = 'animate-pulse';
      } else if (deployment.status === 'queued') {
        statusIcon = 'fa-clock';
        statusColor = 'text-yellow-600';
        statusText = 'Queued';
        rowBg = index === 0 ? 'bg-yellow-100' : 'bg-yellow-50';
      } else if (deployment.status === 'pending') {
        statusIcon = 'fa-hourglass-half';
        statusColor = 'text-gray-600';
        statusText = 'Pending';
        rowBg = index === 0 ? 'bg-gray-200' : 'bg-gray-100';
      } else if (deployment.status === 'cancelled') {
        statusIcon = 'fa-ban';
        statusColor = 'text-yellow-600';
        statusText = 'Cancelled';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else if (deployment.status === 'skipped') {
        statusIcon = 'fa-forward';
        statusColor = 'text-blue-600';
        statusText = 'Skipped';
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      } else {
        statusIcon = 'fa-circle';
        statusColor = 'text-gray-600';
        statusText = deployment.status;
        rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      }

      // Format relative time
      const completedAt = new Date(deployment.completedAt || deployment.startedAt);
      const relativeTime = getRelativeTime(completedAt);

      // Format duration
      let durationStr = '-';
      if (deployment.duration) {
        const minutes = Math.floor(deployment.duration / 60);
        const seconds = deployment.duration % 60;
        durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }

      html += `
        <tr class="${rowBg} ${animationClass} hover:bg-gray-100 text-xs">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${durationStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">${relativeTime}</td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Add collapsible section for skipped/cancelled if any
  if (hiddenDeployments.length > 0) {
    html += `
      <details class="mt-3">
        <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-900 py-2 px-3 bg-gray-50 rounded flex items-center justify-between">
          <span>
            <i class="fas fa-chevron-right mr-2 text-xs transition-transform"></i>
            Skipped/Cancelled Deployments (${hiddenDeployments.length})
          </span>
        </summary>
        <div class="mt-2 overflow-x-auto">
          <table class="w-full text-sm">
            <tbody>
    `;

    hiddenDeployments.forEach((deployment, index) => {
      let statusIcon, statusColor, statusText;

      if (deployment.status === 'cancelled') {
        statusIcon = 'fa-ban';
        statusColor = 'text-yellow-600';
        statusText = 'Cancelled';
      } else {
        statusIcon = 'fa-forward';
        statusColor = 'text-blue-600';
        statusText = 'Skipped';
      }

      const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      const completedAt = new Date(deployment.completedAt || deployment.startedAt);
      const relativeTime = getRelativeTime(completedAt);

      let durationStr = '-';
      if (deployment.duration) {
        const minutes = Math.floor(deployment.duration / 60);
        const seconds = deployment.duration % 60;
        durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      }

      html += `
        <tr class="${rowBg} opacity-75 text-xs">
          <td class="py-2 px-3">
            <div class="flex items-center gap-2">
              <i class="fas ${statusIcon} ${statusColor}"></i>
              <span class="${statusColor} font-medium">${statusText}</span>
            </div>
          </td>
          <td class="py-2 px-3">
            <div class="truncate max-w-md">${escapeHtml(deployment.action)}</div>
            ${deployment.itemId ? `<div class="text-xs text-gray-500 truncate">${escapeHtml(deployment.itemId)}</div>` : ''}
          </td>
          <td class="py-2 px-3 text-right font-mono text-gray-500">${durationStr}</td>
          <td class="py-2 px-3 text-right text-gray-400">${relativeTime}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </details>
    `;
  }

  cardContent.innerHTML = html;

  // Add event listener to rotate chevron on details toggle
  const details = cardContent.querySelector('details');
  if (details) {
    details.addEventListener('toggle', (e) => {
      const chevron = e.target.querySelector('.fa-chevron-right');
      if (chevron) {
        chevron.style.transform = e.target.open ? 'rotate(90deg)' : 'rotate(0deg)';
      }
    });
  }
}

/**
 * Converts a date to relative time string
 *
 * Returns human-readable relative time (e.g., "2 minutes ago", "3 hours ago").
 *
 * @param {Date} date - Date to convert
 *
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/**
 * Starts background polling for deployment history
 *
 * Sets up interval to refresh deployment history every 10 seconds.
 */
export function startDeploymentHistoryPolling() {
  if (window.historyPollInterval) return; // Already polling

  // Run initial update immediately
  const dashboardCard = document.getElementById('deployments-card');
  if (dashboardCard) {
    updateDashboardDeployments();
  }

  // Poll every 10 seconds to refresh history (includes code pushes, not just admin changes)
  // More frequent polling ensures users see deployment status updates quickly
  window.historyPollInterval = setInterval(async () => {
    // Initialize array if not exists
    if (!window.activeDeployments) {
      window.activeDeployments = [];
    }

    // Check for new in-progress deployments from GitHub and add to tracking
    try {
      const githubDeployments = await fetchRecentDeploymentsFromGitHub();
      const inProgressDeployments = githubDeployments.filter(d =>
        d.status === 'pending' || d.status === 'queued' || d.status === 'in_progress'
      );

      // Add any new deployments that aren't already being tracked
      inProgressDeployments.forEach(githubDep => {
        const alreadyTracking = window.activeDeployments.some(d => d.commitSha === githubDep.commitSha);
        if (!alreadyTracking) {
          window.activeDeployments.push({
            commitSha: githubDep.commitSha,
            action: githubDep.action,
            itemId: null,
            startedAt: new Date(githubDep.startedAt),
            status: githubDep.status
          });
          showDeploymentBanner();
          startDeploymentPolling();
        }
      });
    } catch (error) {
      console.error('Failed to check for new deployments:', error);
    }

    // Update dashboard deployments (fetches from GitHub via getDeploymentHistory)
    const dashboardCard = document.getElementById('deployments-card');
    if (dashboardCard) {
      await updateDashboardDeployments();
    }
  }, window.DEPLOYMENT_HISTORY_POLL_INTERVAL);
}

/**
 * Stops deployment history polling
 *
 * Clears the polling interval.
 */
export function stopDeploymentHistoryPolling() {
  if (window.historyPollInterval) {
    clearInterval(window.historyPollInterval);
    window.historyPollInterval = null;
  }
}

/**
 * Starts polling for active deployment status
 *
 * Sets up interval to check deployment status every 5 seconds and handles completion.
 */
export function startDeploymentPolling() {
  if (window.deploymentPollInterval) return; // Already polling

  window.deploymentPollInterval = setInterval(async () => {
    try {
      // Defensive check: ensure activeDeployments array exists
      if (!window.activeDeployments || window.activeDeployments.length === 0) {
        hideDeploymentBanner();
        return;
      }

      // Update time display
      updateDeploymentBanner();

      // Check status of each deployment
      for (let i = window.activeDeployments.length - 1; i >= 0; i--) {
        const deployment = window.activeDeployments[i];

        // Timeout after configured duration
        const elapsed = Math.floor((new Date() - deployment.startedAt) / 1000);
        if (elapsed > window.DEPLOYMENT_TIMEOUT) {
          window.activeDeployments.splice(i, 1);

          if (window.activeDeployments.length === 0) {
            showDeploymentCompletion(true, [deployment]);
          }
          continue;
        }

        try {
          const response = await fetch(`${window.API_BASE}/deployment-status?sha=${deployment.commitSha}`);
          if (!response.ok) {
            console.warn(`Deployment status check failed: ${response.status}`);
            continue;
          }

          const data = await response.json();

          // Update deployment status
          deployment.status = data.status;
          deployment.updatedAt = new Date();
          updateDashboardDeployments();

          if (data.status === 'completed') {
            // Deployment successful
            addToDeploymentHistory(deployment);
            window.activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            // Only update banner when ALL deployments are complete
            if (window.activeDeployments.length === 0) {
              showDeploymentCompletion(true, [deployment]);
            }
          } else if (data.status === 'failed') {
            // Deployment failed
            addToDeploymentHistory(deployment);
            window.activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            if (window.activeDeployments.length === 0) {
              showDeploymentCompletion(false, [deployment]);
            }
          } else if (data.status === 'cancelled' || data.status === 'skipped') {
            // Deployment cancelled or skipped (superseded by newer commit)
            addToDeploymentHistory(deployment);
            window.activeDeployments.splice(i, 1);
            updateDashboardDeployments();

            // Don't show error for cancelled/skipped - this is normal when multiple changes are queued
            // The newer deployment will include all changes from this one
            if (window.activeDeployments.length === 0) {
              hideDeploymentBanner();
            }
          }
          // pending, queued, in_progress continue polling
        } catch (error) {
          console.error('Failed to check deployment status:', error);
        }
      }
    } catch (error) {
      console.error('Error in deployment polling interval:', error);
      // Don't stop polling even on error
    }
  }, window.DEPLOYMENT_STATUS_POLL_INTERVAL);
}
