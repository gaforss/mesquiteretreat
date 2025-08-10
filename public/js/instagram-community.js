// Instagram Community JavaScript
document.getElementById('year').textContent = new Date().getFullYear();

// Global state
let currentPage = 1;
let currentFilter = 'all';
let activeContest = null;

// Initialize the page
async function initInstagramCommunity() {
  await Promise.all([
    loadActiveContest(),
    loadStats(),
    loadInstagramPhotos(),
    loadHashtagStats(),
    loadInstagramFeed(),
    setupEventListeners()
  ]);
}

// Load active contest
async function loadActiveContest() {
  try {
    const response = await fetch('/api/photo-contests');
    const data = await response.json();
    
    if (data.ok && data.contests.length > 0) {
      // Find the first active contest
      activeContest = data.contests.find(contest => contest.status === 'active');
      if (activeContest) {
        displayActiveContest(activeContest);
      }
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
    const [photosResponse, contestsResponse, instagramStatsResponse] = await Promise.all([
      fetch('/api/instagram/photos?limit=1'),
      fetch('/api/photo-contests'),
      fetch('/api/instagram/stats')
    ]);
    
    const photosData = await photosResponse.json();
    const contestsData = await contestsResponse.json();
    const instagramStatsData = await instagramStatsResponse.json();
    
    if (photosData.ok) {
      document.getElementById('totalPhotos').textContent = photosData.total || 0;
    }
    
    if (contestsData.ok) {
      const activeContests = contestsData.contests.filter(c => c.status === 'active');
      document.getElementById('activeContests').textContent = activeContests.length;
    }
    
    if (instagramStatsData.ok) {
      document.getElementById('totalLikes').textContent = instagramStatsData.stats.totalLikes || 0;
      document.getElementById('communityMembers').textContent = instagramStatsData.stats.uniqueUsers || 0;
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load Instagram photos
async function loadInstagramPhotos(page = 1, filter = 'all') {
  try {
    const params = new URLSearchParams({
      page: page,
      limit: 12,
      status: 'approved,featured'
    });
    
    if (filter !== 'all') {
      params.append('location_tag', filter);
    }
    
    const response = await fetch(`/api/instagram/photos?${params}`);
    const data = await response.json();
    
    if (data.ok) {
      displayInstagramPhotos(data.photos, page === 1);
      currentPage = page;
      
      // Show/hide load more button
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = data.page < data.pages ? 'block' : 'none';
      }
    }
  } catch (error) {
    console.error('Error loading Instagram photos:', error);
  }
}

// Display Instagram photos in grid
function displayInstagramPhotos(photos, clearExisting = true) {
  const grid = document.getElementById('photoGrid');
  
  if (clearExisting) {
    grid.innerHTML = '';
  }
  
  if (photos.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <p class="text-secondary">No Instagram photos found yet.</p>
        <p class="text-secondary">Be the first to share using our hashtags!</p>
        <a href="https://instagram.com/mesquiteretreat" target="_blank" rel="noopener" class="btn-custom mt-3">
          📸 Follow on Instagram
        </a>
      </div>
    `;
    return;
  }
  
  photos.forEach(photo => {
    const card = createInstagramPhotoCard(photo);
    grid.appendChild(card);
  });
}

// Create Instagram photo card element
function createInstagramPhotoCard(photo) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.dataset.photoId = photo._id;
  
  card.innerHTML = `
    <img src="${photo.photo_url}" alt="${photo.caption || 'Instagram photo'}" class="photo-image" loading="lazy" />
    <div class="photo-overlay">
      <div class="photo-info">
        <div class="photo-caption">${photo.caption || 'Beautiful moment at Mesquite Retreat'}</div>
        <div class="photo-meta">
          <span>@${photo.instagram_username}</span>
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
      <img src="${photo.photo_url}" alt="${photo.caption || 'Instagram photo'}" style="max-width: 100%; border-radius: 12px; margin-bottom: 20px;" />
      <h3>${photo.caption || 'Beautiful moment at Mesquite Retreat'}</h3>
      <p style="color: var(--muted); margin-bottom: 20px;">
        Shared by @${photo.instagram_username} on ${new Date(photo.instagram_timestamp).toLocaleDateString()}
      </p>
      
      ${photo.hashtags && photo.hashtags.length > 0 ? `
        <div style="margin-bottom: 20px;">
          ${photo.hashtags.map(tag => 
            `<span class="hashtag-chip" style="margin: 4px;">#${tag}</span>`
          ).join('')}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>❤️ ${photo.likes_count || 0}</span>
          <span>💬 ${photo.comments_count || 0}</span>
        </div>
      </div>
      
      <a href="${photo.permalink}" target="_blank" rel="noopener" class="cta">
        📱 View on Instagram
      </a>
      
      ${photo.location_tag ? `
        <p style="color: var(--muted); font-size: 0.9rem; margin-top: 10px;">
          📍 Location: ${photo.location_tag}
        </p>
      ` : ''}
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// Load hashtag statistics
async function loadHashtagStats() {
  try {
    const response = await fetch('/api/instagram/hashtags/stats');
    const data = await response.json();
    
    if (data.ok) {
      displayHashtagStats(data.hashtags);
    }
  } catch (error) {
    console.error('Error loading hashtag stats:', error);
  }
}

// Display hashtag statistics
function displayHashtagStats(hashtags) {
  const grid = document.getElementById('hashtagGrid');
  
  if (hashtags.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 20px;">
        <p class="text-secondary">No hashtag data yet.</p>
      </div>
    `;
    return;
  }
  
  // Add some default hashtags if none exist
  const defaultHashtags = [
    { _id: 'MesquiteRetreat', count: 0, total_likes: 0 },
    { _id: 'Scottsdale', count: 0, total_likes: 0 },
    { _id: 'DesertOasis', count: 0, total_likes: 0 },
    { _id: 'PoolLife', count: 0, total_likes: 0 },
    { _id: 'GoldenHour', count: 0, total_likes: 0 },
    { _id: 'GolfLife', count: 0, total_likes: 0 }
  ];
  
  const allHashtags = [...hashtags, ...defaultHashtags];
  const uniqueHashtags = allHashtags.filter((tag, index, self) => 
    index === self.findIndex(t => t._id === tag._id)
  );
  
  grid.innerHTML = uniqueHashtags.slice(0, 6).map(tag => `
    <div class="hashtag-card">
      <div class="hashtag-name">#${tag._id}</div>
      <div class="hashtag-count">${tag.count || 0} photos</div>
    </div>
  `).join('');
}

// Load Instagram feed
async function loadInstagramFeed() {
  try {
    const response = await fetch('/api/instagram/feed');
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
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      setActiveFilter(filter);
      loadInstagramPhotos(1, filter);
    });
  });
  
  // Load more button
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    loadInstagramPhotos(currentPage + 1, currentFilter);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initInstagramCommunity);

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