// Guest Photos & Contests JavaScript
document.getElementById('year').textContent = new Date().getFullYear();

// Global state
let currentPage = 1;
let currentFilter = 'all';
let selectedFile = null;
let activeContest = null;

// Initialize the page
async function initGuestPhotos() {
  await Promise.all([
    loadActiveContest(),
    loadStats(),
    loadPhotos(),
    loadInstagramFeed(),
    setupEventListeners()
  ]);
}

// Load active contest
async function loadActiveContest() {
  try {
    const response = await fetch('/api/guest-photos/contests/active');
    const data = await response.json();
    
    if (data.ok && data.contests.length > 0) {
      activeContest = data.contests[0]; // Get the first active contest
      displayActiveContest(activeContest);
    }
  } catch (error) {
    console.error('Error loading active contest:', error);
  }
}

// Display active contest banner
function displayActiveContest(contest) {
  const banner = document.getElementById('activeContestBanner');
  const hashtag = document.getElementById('contestHashtag');
  const description = document.getElementById('contestDescription');
  const prizes = document.getElementById('contestPrizes');
  
  if (banner && contest) {
    hashtag.textContent = `#${contest.hashtag}`;
    description.textContent = contest.description;
    
    if (contest.prizes && contest.prizes.length > 0) {
      const prizeText = contest.prizes.map(prize => 
        `${prize.title}: ${prize.description}`
      ).join(', ');
      prizes.innerHTML = `<strong>🏆 Prizes:</strong> ${prizeText}`;
    }
    
    banner.style.display = 'block';
  }
}

// Load statistics
async function loadStats() {
  try {
    const [photosResponse, contestsResponse, hashtagsResponse] = await Promise.all([
      fetch('/api/guest-photos/photos?limit=1'),
      fetch('/api/guest-photos/contests/active'),
      fetch('/api/guest-photos/hashtags/stats')
    ]);
    
    const photosData = await photosResponse.json();
    const contestsData = await contestsResponse.json();
    const hashtagsData = await hashtagsResponse.json();
    
    if (photosData.ok) {
      document.getElementById('totalPhotos').textContent = photosData.total || 0;
      
      // Calculate total likes
      const totalLikes = hashtagsData.ok ? 
        hashtagsData.hashtags.reduce((sum, tag) => sum + tag.total_likes, 0) : 0;
      document.getElementById('totalLikes').textContent = totalLikes;
    }
    
    if (contestsData.ok) {
      document.getElementById('activeContests').textContent = contestsData.contests.length;
    }
    
    // Estimate community members (unique email addresses)
    if (photosData.ok) {
      // This would need a separate API endpoint for unique users
      document.getElementById('communityMembers').textContent = Math.floor(photosData.total * 0.8);
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load photos
async function loadPhotos(page = 1, filter = 'all') {
  try {
    const params = new URLSearchParams({
      page: page,
      limit: 12,
      status: 'approved,featured'
    });
    
    if (filter !== 'all') {
      params.append('location_tag', filter);
    }
    
    const response = await fetch(`/api/guest-photos/photos?${params}`);
    const data = await response.json();
    
    if (data.ok) {
      displayPhotos(data.photos, page === 1);
      currentPage = page;
      
      // Show/hide load more button
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = data.page < data.pages ? 'block' : 'none';
      }
    }
  } catch (error) {
    console.error('Error loading photos:', error);
  }
}

// Display photos in grid
function displayPhotos(photos, clearExisting = true) {
  const grid = document.getElementById('photoGrid');
  
  if (clearExisting) {
    grid.innerHTML = '';
  }
  
  photos.forEach(photo => {
    const card = createPhotoCard(photo);
    grid.appendChild(card);
  });
}

// Create photo card element
function createPhotoCard(photo) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.dataset.photoId = photo._id;
  
  card.innerHTML = `
    <img src="${photo.photo_url}" alt="${photo.caption || 'Guest photo'}" class="photo-image" loading="lazy" />
    <div class="photo-overlay">
      <div class="photo-info">
        <div class="photo-caption">${photo.caption || 'Beautiful moment at Mesquite Retreat'}</div>
        <div class="photo-meta">
          <span>${photo.guest_name || 'Guest'}</span>
          <div class="photo-likes">
            <span>❤️</span>
            <span>${photo.likes_count || 0}</span>
          </div>
        </div>
        ${photo.hashtags && photo.hashtags.length > 0 ? `
          <div class="photo-hashtags">
            ${photo.hashtags.slice(0, 3).map(tag => 
              `<span class="hashtag-chip">#${tag}</span>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Add click handler for photo detail
  card.addEventListener('click', () => showPhotoDetail(photo));
  
  return card;
}

// Show photo detail modal
function showPhotoDetail(photo) {
  const modal = document.getElementById('photoDetailModal');
  const content = document.getElementById('photoDetailContent');
  
  content.innerHTML = `
    <div style="text-align: center;">
      <img src="${photo.photo_url}" alt="${photo.caption || 'Guest photo'}" style="max-width: 100%; border-radius: 12px; margin-bottom: 20px;" />
      <h3>${photo.caption || 'Beautiful moment at Mesquite Retreat'}</h3>
      <p style="color: var(--muted); margin-bottom: 20px;">
        Shared by ${photo.guest_name || 'Guest'} on ${new Date(photo.created_at).toLocaleDateString()}
      </p>
      
      ${photo.hashtags && photo.hashtags.length > 0 ? `
        <div style="margin-bottom: 20px;">
          ${photo.hashtags.map(tag => 
            `<span class="hashtag-chip" style="margin: 4px;">#${tag}</span>`
          ).join('')}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
        <button class="cta" onclick="likePhoto('${photo._id}')">
          ❤️ Like (${photo.likes_count || 0})
        </button>
        ${photo.instagram_url ? `
          <a href="${photo.instagram_url}" target="_blank" rel="noopener" class="cta secondary">
            📱 View on Instagram
          </a>
        ` : ''}
      </div>
      
      ${photo.location_tag ? `
        <p style="color: var(--muted); font-size: 0.9rem;">
          📍 Location: ${photo.location_tag}
        </p>
      ` : ''}
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// Like a photo
async function likePhoto(photoId) {
  try {
    const email = document.getElementById('uploadEmail')?.value || 'anonymous@guest.com';
    
    const response = await fetch(`/api/guest-photos/photos/${photoId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ guest_email: email })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      // Update the like count in the UI
      const likeElements = document.querySelectorAll(`[data-photo-id="${photoId}"] .photo-likes span:last-child`);
      likeElements.forEach(el => {
        el.textContent = data.likes_count;
      });
      
      // Show success message
      showToast('Photo liked! ❤️', 'success');
    }
  } catch (error) {
    console.error('Error liking photo:', error);
    showToast('Failed to like photo', 'error');
  }
}

// Load Instagram feed
async function loadInstagramFeed() {
  try {
    const response = await fetch('/api/guest-photos/instagram/feed');
    const data = await response.json();
    
    if (data.ok) {
      displayInstagramFeed(data.photos);
    }
  } catch (error) {
    console.error('Error loading Instagram feed:', error);
  }
}

// Display Instagram feed
function displayInstagramFeed(photos) {
  const grid = document.getElementById('instagramGrid');
  
  if (photos.length === 0) {
    // Show placeholder images
    grid.innerHTML = `
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/ffb703/ffffff?text=📸" alt="Instagram placeholder" />
      </div>
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/8ab4ff/ffffff?text=🏊‍♂️" alt="Instagram placeholder" />
      </div>
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/ffb703/ffffff?text=🌵" alt="Instagram placeholder" />
      </div>
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/8ab4ff/ffffff?text=🌅" alt="Instagram placeholder" />
      </div>
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/ffb703/ffffff?text=🍷" alt="Instagram placeholder" />
      </div>
      <div class="instagram-item">
        <img src="https://via.placeholder.com/300x300/8ab4ff/ffffff?text=⛳" alt="Instagram placeholder" />
      </div>
    `;
    return;
  }
  
  grid.innerHTML = photos.slice(0, 6).map(photo => `
    <div class="instagram-item">
      <img src="${photo.photo_url}" alt="${photo.caption || 'Instagram photo'}" />
    </div>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Upload photo button
  document.getElementById('uploadPhotoBtn')?.addEventListener('click', () => {
    document.getElementById('uploadModal').classList.remove('hidden');
  });
  
  // Upload section button
  document.getElementById('uploadBtn')?.addEventListener('click', () => {
    document.getElementById('photoInput').click();
  });
  
  // File input change
  document.getElementById('photoInput')?.addEventListener('change', handleFileSelect);
  
  // Photo upload form
  document.getElementById('photoUploadForm')?.addEventListener('submit', handlePhotoUpload);
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      setActiveFilter(filter);
      loadPhotos(1, filter);
    });
  });
  
  // Load more button
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    loadPhotos(currentPage + 1, currentFilter);
  });
  
  // Enter contest button
  document.getElementById('enterContestBtn')?.addEventListener('click', () => {
    document.getElementById('uploadModal').classList.remove('hidden');
  });
  
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

// Handle file selection
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile = file;
    showPhotoPreview(file);
  }
}

// Show photo preview
function showPhotoPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('photoPreview');
    const image = document.getElementById('previewImage');
    
    image.src = e.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Handle photo upload
async function handlePhotoUpload(event) {
  event.preventDefault();
  
  if (!selectedFile) {
    showToast('Please select a photo first', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('photo', selectedFile);
  
  // Add form data
  const form = event.target;
  const formElements = form.elements;
  
  for (let element of formElements) {
    if (element.name && element.value) {
      formData.append(element.name, element.value);
    }
  }
  
  // Add contest ID if active
  if (activeContest) {
    formData.append('contest_id', activeContest._id);
  }
  
  const messageEl = document.getElementById('uploadMessage');
  messageEl.textContent = 'Uploading your photo...';
  messageEl.className = 'form-message loading';
  
  try {
    const response = await fetch('/api/guest-photos/submit', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.ok) {
      messageEl.textContent = data.message || 'Photo uploaded successfully!';
      messageEl.className = 'form-message success';
      
      // Reset form
      form.reset();
      selectedFile = null;
      document.getElementById('photoPreview').style.display = 'none';
      
      // Close modal after delay
      setTimeout(() => {
        document.getElementById('uploadModal').classList.add('hidden');
        messageEl.textContent = '';
        
        // Reload photos
        loadPhotos(1, currentFilter);
        loadStats();
      }, 2000);
      
    } else {
      messageEl.textContent = data.error || 'Failed to upload photo';
      messageEl.className = 'form-message error';
    }
    
  } catch (error) {
    console.error('Error uploading photo:', error);
    messageEl.textContent = 'Network error. Please try again.';
    messageEl.className = 'form-message error';
  }
}

// Set active filter
function setActiveFilter(filter) {
  currentFilter = filter;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    }
  });
}

// Show toast message
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#ffc107'};
    color: #111;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,.3);
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGuestPhotos);

// Add CSS for buttons
const style = document.createElement('style');
style.textContent = `
  .btn-custom {
    background: linear-gradient(135deg, #ffb703, #ffd166);
    color: #111;
    border: none;
    padding: 16px 32px;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    margin: 0 12px;
    transition: all 0.3s ease;
    box-shadow: 0 8px 25px rgba(255,183,3,.25);
    cursor: pointer;
  }
  
  .btn-custom:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(255,183,3,.35);
    color: #111;
    filter: brightness(1.05);
  }
  
  .d-flex { display: flex !important; }
  .flex-wrap { flex-wrap: wrap !important; }
  .gap-3 { gap: 1rem !important; }
  .justify-content-center { justify-content: center !important; }
  .text-center { text-align: center !important; }
  .mt-3 { margin-top: 1rem !important; }
  .mb-4 { margin-bottom: 1.5rem !important; }
  .text-secondary { color: var(--muted) !important; }
`;
document.head.appendChild(style); 