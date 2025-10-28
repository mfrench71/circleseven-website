/**
 * Shared Header Component
 * Renders the admin header with deployment banner and navigation
 */

export function renderHeader() {
  return `
    <!-- Full Width Header (above sidebar and content) -->
    <header id="main-header" class="bg-white border-bottom position-fixed top-0 start-0 end-0" style="z-index: 1030;">
      <!-- Deployment Status Banner (shown when deploying) -->
      <div id="deployment-status-header" class="d-none bg-primary text-white">
        <div class="px-4 py-2">
          <div class="d-flex align-items-center justify-content-between small">
            <div class="d-flex align-items-center gap-2">
              <i class="fas fa-spinner fa-spin"></i>
              <span id="deployment-status-message" class="fw-medium">Publishing changes...</span>
            </div>
            <div id="deployment-status-time" class="font-monospace opacity-75">0:00</div>
          </div>
        </div>
      </div>

      <!-- Header Content -->
      <div class="px-4 py-2">
        <div class="d-flex justify-content-end align-items-center gap-3">
            <a href="/" id="visit-site-link" class="btn btn-link text-primary text-decoration-none d-flex align-items-center gap-2" target="_blank" rel="noopener" title="View public site">
              <i class="fas fa-external-link-alt small"></i>
              <span id="visit-site-name">Visit Site</span>
            </a>
            <button onclick="netlifyIdentity.logout()" class="btn btn-link text-secondary text-decoration-none d-flex align-items-center gap-2" title="Log out of admin">
              <i class="fas fa-sign-out-alt"></i>
              Log Out
            </button>
        </div>
      </div>
    </header>
  `;
}

/**
 * Initialize header - mount it to the DOM
 */
export function initHeader() {
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    headerContainer.innerHTML = renderHeader();
  }
}
