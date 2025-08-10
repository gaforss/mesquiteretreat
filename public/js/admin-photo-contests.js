// Admin Photo Contests & Instagram JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initPhotoContestsAdmin();
});

async function initPhotoContestsAdmin() {
  await Promise.all([
    loadContests(),
    loadInstagramModerationPhotos(),
    setupEventListeners()
  ]);
}

// Load contests
async function loadContests() {
  try {
    const response = await fetch('/api/photo-contests');
    const data = await response.json();
    
    if (data.ok) {
      displayContests(data.contests);
      populateContestDropdowns(data.contests);
    }
  } catch (error) {
    console.error('Error loading contests:', error);
  }
}

// Display contests
function displayContests(contests) {
  const container = document.getElementById('contestsList');
  
  if (contests.length === 0) {
    container.innerHTML = '<p class="text-secondary">No contests found. Create your first contest!</p>';
    return;
  }
  
  container.innerHTML = contests.map(contest => `
    <div class="contest-card">
      <div class="contest-header">
        <h3 class="contest-title">${contest.name}</h3>
        <span class="contest-status status-${contest.status}">${contest.status}</span>
      </div>
      
      <p class="text-secondary">${contest.description}</p>
      
      <div class="contest-stats">
        <div class="stat-item">
          <div class="stat-number">${contest.total_entries || 0}</div>
          <div class="stat-label">Entries</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${contest.total_participants || 0}</div>
          <div class="stat-label">Participants</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${contest.total_likes || 0}</div>
          <div class="stat-label">Likes</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">#${contest.hashtag}</div>
          <div class="stat-label">Hashtag</div>
        </div>
      </div>
      
      <div class="contest-dates">
        <small class="text-secondary">
          ${new Date(contest.start_date).toLocaleDateString()} - ${new Date(contest.end_date).toLocaleDateString()}
        </small>
      </div>
      
      <div class="contest-actions" style="margin-top: 16px;">
        <button class="btn-sm btn-approve" onclick="editContest('${contest._id}')">Edit</button>
        <button class="btn-sm btn-reject" onclick="deleteContest('${contest._id}')">Delete</button>
        ${contest.status === 'active' ? 
          '<button class="btn-sm btn-feature" onclick="pauseContest(\'' + contest._id + '\')">Pause</button>' :
          '<button class="btn-sm btn-approve" onclick="activateContest(\'' + contest._id + '\')">Activate</button>'
        }
      </div>
    </div>
  `).join('');
}

// Populate contest dropdowns
function populateContestDropdowns(contests) {
  const fetchContestSelect = document.getElementById('fetchContest');
  const contestFilterSelect = document.getElementById('contestFilter');
  
  if (fetchContestSelect) {
    fetchContestSelect.innerHTML = '<option value="">No contest assignment</option>' +
      contests.filter(c => c.status === 'active').map(contest => 
        `<option value="${contest._id}">${contest.name} (#${contest.hashtag})</option>`
      ).join('');
  }
  
  if (contestFilterSelect) {
    contestFilterSelect.innerHTML = '<option value="">All Contests</option>' +
      contests.map(contest => 
        `<option value="${contest._id}">${contest.name} (#${contest.hashtag})</option>`
      ).join('');
  }
}

// Load Instagram photos for moderation
async function loadInstagramModerationPhotos() {
  try {
    const statusFilter = document.getElementById('photoStatusFilter').value;
    const contestFilter = document.getElementById('contestFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;
    
    const params = new URLSearchParams({
      status: statusFilter,
      page: 1,
      limit: 20
    });
    
    if (contestFilter) params.append('contest_id', contestFilter);
    if (locationFilter) params.append('location_tag', locationFilter);
    
    const response = await fetch(`/api/instagram/photos?${params}`);
    const data = await response.json();
    
    if (data.ok) {
      displayInstagramModerationPhotos(data.photos);
    }
  } catch (error) {
    console.error('Error loading Instagram moderation photos:', error);
  }
}

// Display Instagram photos for moderation
function displayInstagramModerationPhotos(photos) {
  const grid = document.getElementById('moderationGrid');
  
  if (photos.length === 0) {
    grid.innerHTML = '<p class="text-secondary">No Instagram photos found for the selected filters.</p>';
    return;
  }
  
  grid.innerHTML = photos.map(photo => `
    <div class="photo-item">
      <img src="${photo.photo_url}" alt="${photo.caption || 'Instagram photo'}" class="photo-image" />
      <div class="photo-info">
        <div class="photo-caption">${photo.caption || 'No caption'}</div>
        <div class="photo-meta">
          <span>@${photo.instagram_username}</span>
          <span>❤️ ${photo.likes_count || 0}</span>
        </div>
        <div class="photo-actions">
          ${photo.status === 'pending' ? `
            <button class="btn-sm btn-approve" onclick="moderateInstagramPhoto('${photo._id}', 'approved')">Approve</button>
            <button class="btn-sm btn-reject" onclick="moderateInstagramPhoto('${photo._id}', 'rejected')">Reject</button>
          ` : photo.status === 'approved' ? `
            <button class="btn-sm btn-feature" onclick="moderateInstagramPhoto('${photo._id}', 'featured')">Feature</button>
            <button class="btn-sm btn-reject" onclick="moderateInstagramPhoto('${photo._id}', 'rejected')">Reject</button>
          ` : photo.status === 'featured' ? `
            <button class="btn-sm btn-approve" onclick="moderateInstagramPhoto('${photo._id}', 'approved')">Unfeature</button>
          ` : ''}
          <button class="btn-sm btn-reject" onclick="deleteInstagramPhoto('${photo._id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Create contest button
  document.getElementById('createContestBtn')?.addEventListener('click', () => {
    document.getElementById('contestForm').style.display = 'block';
  });
  
  // Cancel contest form
  document.getElementById('cancelContestBtn')?.addEventListener('click', () => {
    document.getElementById('contestForm').style.display = 'none';
    document.getElementById('newContestForm').reset();
  });
  
  // New contest form submission
  document.getElementById('newContestForm')?.addEventListener('submit', handleCreateContest);
  
  // Instagram fetch form submission
  document.getElementById('fetchInstagramForm')?.addEventListener('submit', handleFetchInstagram);
  
  // Filter changes
  document.getElementById('photoStatusFilter')?.addEventListener('change', loadInstagramModerationPhotos);
  document.getElementById('contestFilter')?.addEventListener('change', loadInstagramModerationPhotos);
  document.getElementById('locationFilter')?.addEventListener('change', loadInstagramModerationPhotos);
}

// Handle create contest
async function handleCreateContest(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  
  const messageEl = document.getElementById('contestMessage');
  messageEl.textContent = 'Creating contest...';
  messageEl.className = 'form-message loading';
  
  try {
    const response = await fetch('/api/photo-contests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      messageEl.textContent = 'Contest created successfully!';
      messageEl.className = 'form-message success';
      
      // Reset form and hide
      setTimeout(() => {
        form.reset();
        document.getElementById('contestForm').style.display = 'none';
        messageEl.textContent = '';
        
        // Reload contests
        loadContests();
      }, 2000);
      
    } else {
      messageEl.textContent = data.error || 'Failed to create contest';
      messageEl.className = 'form-message error';
    }
    
  } catch (error) {
    console.error('Error creating contest:', error);
    messageEl.textContent = 'Network error. Please try again.';
    messageEl.className = 'form-message error';
  }
}

// Handle Instagram fetch
async function handleFetchInstagram(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  
  const messageEl = document.getElementById('fetchMessage');
  messageEl.textContent = 'Fetching Instagram photos...';
  messageEl.className = 'form-message loading';
  
  try {
    const response = await fetch('/api/instagram/fetch-by-hashtag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      messageEl.textContent = data.message || 'Instagram photos fetched successfully!';
      messageEl.className = 'form-message success';
      
      // Reload moderation photos
      loadInstagramModerationPhotos();
      
      // Clear form after delay
      setTimeout(() => {
        messageEl.textContent = '';
      }, 3000);
      
    } else {
      messageEl.textContent = data.error || 'Failed to fetch Instagram photos';
      messageEl.className = 'form-message error';
    }
    
  } catch (error) {
    console.error('Error fetching Instagram photos:', error);
    messageEl.textContent = 'Network error. Please try again.';
    messageEl.className = 'form-message error';
  }
}

// Moderate Instagram photo
window.moderateInstagramPhoto = async function(photoId, status) {
  try {
    const response = await fetch(`/api/instagram/photos/${photoId}/moderate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast(`Instagram photo ${status} successfully!`, 'success');
      loadInstagramModerationPhotos();
    } else {
      showToast(data.error || 'Failed to moderate Instagram photo', 'error');
    }
    
  } catch (error) {
    console.error('Error moderating Instagram photo:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Delete Instagram photo
window.deleteInstagramPhoto = async function(photoId) {
  if (!confirm('Are you sure you want to delete this Instagram photo? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/instagram/photos/${photoId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast('Instagram photo deleted successfully!', 'success');
      loadInstagramModerationPhotos();
    } else {
      showToast(data.error || 'Failed to delete Instagram photo', 'error');
    }
    
  } catch (error) {
    console.error('Error deleting Instagram photo:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Edit contest
window.editContest = function(contestId) {
  // This would open an edit modal or redirect to edit page
  showToast('Edit functionality coming soon!', 'info');
}

// Delete contest
window.deleteContest = async function(contestId) {
  if (!confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/photo-contests/${contestId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast('Contest deleted successfully!', 'success');
      loadContests();
    } else {
      showToast(data.error || 'Failed to delete contest', 'error');
    }
    
  } catch (error) {
    console.error('Error deleting contest:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Pause contest
window.pauseContest = async function(contestId) {
  try {
    const response = await fetch(`/api/photo-contests/${contestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'paused' })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast('Contest paused successfully!', 'success');
      loadContests();
    } else {
      showToast(data.error || 'Failed to pause contest', 'error');
    }
    
  } catch (error) {
    console.error('Error pausing contest:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Activate contest
window.activateContest = async function(contestId) {
  try {
    const response = await fetch(`/api/photo-contests/${contestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'active' })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast('Contest activated successfully!', 'success');
      loadContests();
    } else {
      showToast(data.error || 'Failed to activate contest', 'error');
    }
    
  } catch (error) {
    console.error('Error activating contest:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Show toast message
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
} 