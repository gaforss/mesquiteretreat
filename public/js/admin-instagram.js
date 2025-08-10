// Instagram API Admin Management
document.addEventListener('DOMContentLoaded', function() {
  initInstagramAdmin();
});

async function initInstagramAdmin() {
  await Promise.all([
    loadInstagramConfig(),
    loadInstagramStats(),
    setupEventListeners()
  ]);
}

// Load Instagram configuration status
async function loadInstagramConfig() {
  try {
    const response = await fetch('/api/instagram/config/status');
    const data = await response.json();
    
    if (data.ok) {
      displayConfigStatus(data.status);
    }
  } catch (error) {
    console.error('Error loading Instagram config:', error);
    showError('Failed to load Instagram configuration');
  }
}

// Display configuration status
function displayConfigStatus(status) {
  const configSection = document.getElementById('instagramConfig');
  if (!configSection) return;
  
  const statusHtml = `
    <div class="config-grid">
      <div class="config-item ${status.hasAppId ? 'success' : 'error'}">
        <span class="config-label">App ID</span>
        <span class="config-value">${status.hasAppId ? '✅ Configured' : '❌ Missing'}</span>
      </div>
      <div class="config-item ${status.hasAppSecret ? 'success' : 'error'}">
        <span class="config-label">App Secret</span>
        <span class="config-value">${status.hasAppSecret ? '✅ Configured' : '❌ Missing'}</span>
      </div>
      <div class="config-item ${status.hasAccessToken ? 'success' : 'error'}">
        <span class="config-label">Access Token</span>
        <span class="config-value">${status.hasAccessToken ? '✅ Configured' : '❌ Missing'}</span>
      </div>
      <div class="config-item ${status.isConfigured ? 'success' : 'error'}">
        <span class="config-label">Overall Status</span>
        <span class="config-value">${status.isConfigured ? '✅ Ready' : '❌ Not Ready'}</span>
      </div>
    </div>
    
    ${status.isConfigured ? `
      <div class="mt-3">
        <button onclick="testInstagramConnection()" class="btn btn-primary">
          🔗 Test Connection
        </button>
        <button onclick="validateInstagramToken()" class="btn btn-secondary">
          🔑 Validate Token
        </button>
        <button onclick="getTokenInfo()" class="btn btn-info">
          ℹ️ Token Info
        </button>
      </div>
    ` : `
      <div class="mt-3 alert alert-warning">
        <strong>Setup Required:</strong> Please configure Instagram API credentials in your environment variables.
        <br><br>
        <strong>Required Variables:</strong>
        <ul class="mt-2">
          <li><code>INSTAGRAM_APP_ID</code></li>
          <li><code>INSTAGRAM_APP_SECRET</code></li>
          <li><code>INSTAGRAM_ACCESS_TOKEN</code></li>
        </ul>
        <br>
        <a href="INSTAGRAM_SETUP.md" target="_blank" class="btn btn-sm btn-outline-warning">
          📖 View Setup Guide
        </a>
      </div>
    `}
  `;
  
  configSection.innerHTML = statusHtml;
}

// Load Instagram statistics
async function loadInstagramStats() {
  try {
    const response = await fetch('/api/instagram/stats');
    const data = await response.json();
    
    if (data.ok) {
      displayInstagramStats(data.stats);
    }
  } catch (error) {
    console.error('Error loading Instagram stats:', error);
  }
}

// Display Instagram statistics
function displayInstagramStats(stats) {
  const statsSection = document.getElementById('instagramStats');
  if (!statsSection) return;
  
  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${stats.totalPhotos}</div>
        <div class="stat-label">Total Photos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.pendingPhotos}</div>
        <div class="stat-label">Pending Review</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.approvedPhotos}</div>
        <div class="stat-label">Approved</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.featuredPhotos}</div>
        <div class="stat-label">Featured</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalLikes}</div>
        <div class="stat-label">Total Likes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.uniqueUsers}</div>
        <div class="stat-label">Unique Users</div>
      </div>
    </div>
  `;
  
  statsSection.innerHTML = statsHtml;
}

// Test Instagram connection
async function testInstagramConnection() {
  try {
    showLoading('Testing Instagram connection...');
    
    const response = await fetch('/api/instagram/validate-token');
    const data = await response.json();
    
    if (data.ok && data.valid) {
      showSuccess(`✅ Connection successful! Connected as @${data.user.username}`);
    } else {
      showError(`❌ Connection failed: ${data.error}`);
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    showError('Failed to test Instagram connection');
  }
}

// Validate Instagram token
async function validateInstagramToken() {
  try {
    showLoading('Validating token...');
    
    const response = await fetch('/api/instagram/validate-token');
    const data = await response.json();
    
    if (data.ok) {
      if (data.valid) {
        showSuccess(`✅ Token is valid! Connected as @${data.user.username}`);
      } else {
        showError(`❌ Token validation failed: ${data.error}`);
      }
    } else {
      showError('Failed to validate token');
    }
  } catch (error) {
    console.error('Error validating token:', error);
    showError('Failed to validate token');
  }
}

// Get token information
async function getTokenInfo() {
  try {
    showLoading('Getting token information...');
    
    const response = await fetch('/api/instagram/token-info');
    const data = await response.json();
    
    if (data.ok) {
      displayTokenInfo(data.tokenInfo);
    } else {
      showError('Failed to get token information');
    }
  } catch (error) {
    console.error('Error getting token info:', error);
    showError('Failed to get token information');
  }
}

// Display token information
function displayTokenInfo(tokenInfo) {
  if (tokenInfo.error) {
    showError(`Token info error: ${tokenInfo.error}`);
    return;
  }
  
  const modal = document.getElementById('tokenInfoModal');
  const content = document.getElementById('tokenInfoContent');
  
  content.innerHTML = `
    <h3>Token Information</h3>
    <div class="token-info-grid">
      <div class="info-item">
        <strong>App ID:</strong> ${tokenInfo.app_id || 'N/A'}
      </div>
      <div class="info-item">
        <strong>Type:</strong> ${tokenInfo.type || 'N/A'}
      </div>
      <div class="info-item">
        <strong>Application:</strong> ${tokenInfo.application || 'N/A'}
      </div>
      <div class="info-item">
        <strong>Data Access Expires At:</strong> ${tokenInfo.data_access_expires_at ? new Date(tokenInfo.data_access_expires_at * 1000).toLocaleString() : 'N/A'}
      </div>
      <div class="info-item">
        <strong>Expires At:</strong> ${tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000).toLocaleString() : 'N/A'}
      </div>
      <div class="info-item">
        <strong>Is Valid:</strong> ${tokenInfo.is_valid ? '✅ Yes' : '❌ No'}
      </div>
      <div class="info-item">
        <strong>Scopes:</strong> ${tokenInfo.scopes ? tokenInfo.scopes.join(', ') : 'N/A'}
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// Fetch Instagram photos by hashtag
async function fetchInstagramPhotos() {
  const hashtag = document.getElementById('hashtagInput').value.trim();
  
  if (!hashtag) {
    showError('Please enter a hashtag');
    return;
  }
  
  try {
    showLoading(`Fetching photos for #${hashtag}...`);
    
    const response = await fetch('/api/instagram/fetch-by-hashtag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hashtag })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showSuccess(`✅ Successfully fetched ${data.photos.length} photos for #${hashtag}`);
      // Refresh stats
      loadInstagramStats();
    } else {
      showError(`❌ Failed to fetch photos: ${data.error}`);
    }
  } catch (error) {
    console.error('Error fetching photos:', error);
    showError('Failed to fetch Instagram photos');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Fetch photos form
  const fetchForm = document.getElementById('fetchPhotosForm');
  if (fetchForm) {
    fetchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      fetchInstagramPhotos();
    });
  }
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
      });
    });
  });
  
  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
}

// Utility functions
function showLoading(message) {
  const loadingDiv = document.getElementById('loadingMessage');
  if (loadingDiv) {
    loadingDiv.textContent = message;
    loadingDiv.style.display = 'block';
  }
}

function hideLoading() {
  const loadingDiv = document.getElementById('loadingMessage');
  if (loadingDiv) {
    loadingDiv.style.display = 'none';
  }
}

function showSuccess(message) {
  hideLoading();
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success';
  alertDiv.textContent = message;
  showAlert(alertDiv);
}

function showError(message) {
  hideLoading();
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger';
  alertDiv.textContent = message;
  showAlert(alertDiv);
}

function showAlert(alertDiv) {
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .config-item {
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #ddd;
  }
  
  .config-item.success {
    background-color: #d4edda;
    border-color: #c3e6cb;
  }
  
  .config-item.error {
    background-color: #f8d7da;
    border-color: #f5c6cb;
  }
  
  .config-label {
    display: block;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .config-value {
    font-size: 0.9rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  
  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
  }
  
  .token-info-grid {
    display: grid;
    gap: 1rem;
  }
  
  .info-item {
    padding: 0.75rem;
    background-color: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #007bff;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    margin: 0.25rem;
    font-size: 0.9rem;
  }
  
  .btn-primary { background-color: #007bff; color: white; }
  .btn-secondary { background-color: #6c757d; color: white; }
  .btn-info { background-color: #17a2b8; color: white; }
  .btn-outline-warning { background-color: transparent; color: #ffc107; border: 1px solid #ffc107; }
  
  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 6px;
  }
  
  .alert-success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
  .alert-danger { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  .alert-warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
  
  .mt-3 { margin-top: 1rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mb-4 { margin-bottom: 1.5rem; }
  
  .hidden { display: none !important; }
  
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
`;
document.head.appendChild(style); 