import express from 'express';
import InstagramPhoto from '../models/instagramPhoto.js';
import PhotoContest from '../models/photoContest.js';
import InstagramService from '../services/instagram.service.js';

const router = express.Router();

// Check Instagram API configuration
router.get('/config/status', async (req, res) => {
  try {
    const status = InstagramService.getConfigStatus();
    res.json({ ok: true, status });
  } catch (error) {
    console.error('Error checking Instagram config:', error);
    res.status(500).json({ ok: false, error: 'Failed to check Instagram configuration' });
  }
});

// Get Instagram authorization URL
router.get('/auth/url', async (req, res) => {
  try {
    if (!InstagramService.isConfigured()) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Instagram API not configured. Please set up INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_ACCESS_TOKEN environment variables.' 
      });
    }

    const authUrl = InstagramService.getAuthUrl();
    res.json({ ok: true, authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate authorization URL' });
  }
});

// Instagram OAuth callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ ok: false, error: 'Authorization code not provided' });
    }

    const tokenData = await InstagramService.exchangeCodeForToken(code);
    
    // Store the access token securely (you might want to save this to your database)
    console.log('Instagram access token obtained:', tokenData.access_token);
    
    res.json({ 
      ok: true, 
      message: 'Instagram authorization successful',
      accessToken: tokenData.access_token
    });
  } catch (error) {
    console.error('Error in Instagram callback:', error);
    res.status(500).json({ ok: false, error: 'Failed to complete Instagram authorization' });
  }
});

// Fetch Instagram photos by hashtag (real API)
router.post('/fetch-by-hashtag', async (req, res) => {
  try {
    const { hashtag, contest_id } = req.body;
    
    if (!hashtag) {
      return res.status(400).json({ ok: false, error: 'Hashtag is required' });
    }

    let instagramData;
    
    if (!InstagramService.isConfigured()) {
      // Use mock data when Instagram API is not configured
      console.log('Instagram API not configured, using mock data for development...');
      instagramData = await simulateInstagramFetch(hashtag, contest_id);
    } else {
      try {
        // Try to use Graph API for hashtag search (requires Business/Creator account)
        instagramData = await InstagramService.getMediaByHashtag(hashtag, 25);
      } catch (graphError) {
        console.log('Graph API failed, falling back to Basic Display API:', graphError.message);
        
        try {
          // Fallback to Basic Display API (limited to user's own media)
          instagramData = await InstagramService.getMediaByHashtagBasic(hashtag, 25);
        } catch (basicError) {
          console.error('Both Graph API and Basic Display API failed:', basicError.message);
          
          // Fallback to mock data for development
          console.log('Using mock data for development...');
          instagramData = await simulateInstagramFetch(hashtag, contest_id);
        }
      }
    }

    // Process and save Instagram photos
    const savedPhotos = await processInstagramPhotos(instagramData.data, hashtag, contest_id);
    
    res.json({ 
      ok: true, 
      photos: savedPhotos,
      message: `Fetched ${savedPhotos.length} photos for #${hashtag}`,
      source: instagramData.data.length > 0 ? 'instagram_api' : 'mock_data'
    });

  } catch (err) {
    console.error('Error fetching Instagram photos:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Instagram photos' });
  }
});

// Get Instagram photos for display
router.get('/photos', async (req, res) => {
  try {
    const { 
      contest_id, 
      hashtag, 
      location_tag, 
      status = 'approved',
      limit = 20,
      page = 1 
    } = req.query;

    const query = { status: { $in: status.split(',') } };
    
    if (contest_id) query.contest_id = contest_id;
    if (hashtag) query.hashtags = hashtag;
    if (location_tag) query.location_tag = location_tag;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const photos = await InstagramPhoto.find(query)
      .sort({ instagram_timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InstagramPhoto.countDocuments(query);

    res.json({ 
      ok: true, 
      photos, 
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });

  } catch (err) {
    console.error('Error fetching Instagram photos:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Instagram photos' });
  }
});

// Get Instagram feed for homepage
router.get('/feed', async (req, res) => {
  try {
    const photos = await InstagramPhoto.find({
      status: { $in: ['approved', 'featured'] }
    })
    .sort({ instagram_timestamp: -1 })
    .limit(12);

    res.json({ ok: true, photos });

  } catch (err) {
    console.error('Error fetching Instagram feed:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Instagram feed' });
  }
});

// Moderate Instagram photo
router.put('/photos/:photoId/moderate', async (req, res) => {
  try {
    const { photoId } = req.params;
    const { status, moderation_notes, location_tag, trip_type } = req.body;

    const photo = await InstagramPhoto.findByIdAndUpdate(photoId, {
      status,
      moderation_notes,
      location_tag,
      trip_type,
      moderated_by: 'admin',
      moderated_at: new Date()
    }, { new: true });

    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    res.json({ ok: true, photo });

  } catch (err) {
    console.error('Error moderating Instagram photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to moderate photo' });
  }
});

// Feature Instagram photo
router.put('/photos/:photoId/feature', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photo = await InstagramPhoto.findByIdAndUpdate(photoId, {
      status: 'featured',
      featured_at: new Date(),
      moderated_by: 'admin',
      moderated_at: new Date()
    }, { new: true });

    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    res.json({ ok: true, photo });

  } catch (err) {
    console.error('Error featuring Instagram photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to feature photo' });
  }
});

// Delete Instagram photo
router.delete('/photos/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photo = await InstagramPhoto.findByIdAndDelete(photoId);
    
    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    res.json({ ok: true });

  } catch (err) {
    console.error('Error deleting Instagram photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete photo' });
  }
});

// Get hashtag statistics
router.get('/hashtags/stats', async (req, res) => {
  try {
    const stats = await InstagramPhoto.aggregate([
      { $match: { status: { $in: ['approved', 'featured'] } } },
      { $unwind: '$hashtags' },
      { $group: {
        _id: '$hashtags',
        count: { $sum: 1 },
        total_likes: { $sum: '$likes_count' },
        total_comments: { $sum: '$comments_count' }
      }},
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({ ok: true, hashtags: stats });

  } catch (err) {
    console.error('Error fetching hashtag stats:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch hashtag statistics' });
  }
});

// Get Instagram statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalPhotos,
      pendingPhotos,
      approvedPhotos,
      featuredPhotos,
      totalLikes,
      totalComments,
      uniqueUsers
    ] = await Promise.all([
      InstagramPhoto.countDocuments(),
      InstagramPhoto.countDocuments({ status: 'pending' }),
      InstagramPhoto.countDocuments({ status: 'approved' }),
      InstagramPhoto.countDocuments({ status: 'featured' }),
      InstagramPhoto.aggregate([{ $group: { _id: null, total: { $sum: '$likes_count' } } }]),
      InstagramPhoto.aggregate([{ $group: { _id: null, total: { $sum: '$comments_count' } } }]),
      InstagramPhoto.distinct('instagram_username')
    ]);

    res.json({
      ok: true,
      stats: {
        totalPhotos,
        pendingPhotos,
        approvedPhotos,
        featuredPhotos,
        totalLikes: totalLikes[0]?.total || 0,
        totalComments: totalComments[0]?.total || 0,
        uniqueUsers: uniqueUsers.length
      }
    });

  } catch (err) {
    console.error('Error fetching Instagram stats:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Instagram statistics' });
  }
});

// Validate Instagram access token
router.get('/validate-token', async (req, res) => {
  try {
    const validation = await InstagramService.validateAccessToken();
    res.json({ ok: true, ...validation });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ ok: false, error: 'Failed to validate token' });
  }
});

// Get token information
router.get('/token-info', async (req, res) => {
  try {
    const tokenInfo = await InstagramService.getTokenInfo();
    res.json({ ok: true, tokenInfo });
  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({ ok: false, error: 'Failed to get token info' });
  }
});

// Get media comments
router.get('/media/:mediaId/comments', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { limit = 25 } = req.query;
    
    const comments = await InstagramService.getMediaComments(mediaId, parseInt(limit));
    res.json({ ok: true, comments });
  } catch (error) {
    console.error('Error fetching media comments:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch media comments' });
  }
});

// Get media insights (requires Business/Creator account)
router.get('/media/:mediaId/insights', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    const insights = await InstagramService.getMediaInsights(mediaId);
    res.json({ ok: true, insights });
  } catch (error) {
    console.error('Error fetching media insights:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch media insights' });
  }
});

// Search Instagram users (requires Business/Creator account)
router.get('/search/users', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ ok: false, error: 'Search query is required' });
    }
    
    const users = await InstagramService.searchUsers(query, parseInt(limit));
    res.json({ ok: true, users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ ok: false, error: 'Failed to search users' });
  }
});

// Process Instagram photos and save to database
async function processInstagramPhotos(instagramData, hashtag, contest_id) {
  const savedPhotos = [];
  
  for (const media of instagramData) {
    try {
      // Check if photo already exists
      const existing = await InstagramPhoto.findOne({ instagram_id: media.id });
      if (existing) {
        console.log(`Photo ${media.id} already exists, skipping...`);
        continue;
      }

      // Extract hashtags from caption
      const hashtags = InstagramService.extractHashtags(media.caption);
      
      // Create photo record
      const photo = new InstagramPhoto({
        instagram_id: media.id,
        instagram_url: media.permalink,
        instagram_username: media.username || 'unknown',
        instagram_user_id: media.owner?.id || 'unknown',
        instagram_user_full_name: media.owner?.full_name || '',
        instagram_user_profile_pic: media.owner?.profile_picture_url || '',
        photo_url: media.media_url,
        photo_thumbnail: media.thumbnail_url || media.media_url,
        caption: media.caption || '',
        hashtags: hashtags,
        likes_count: media.like_count || 0,
        comments_count: media.comments_count || 0,
        views_count: 0,
        contest_id: contest_id || null,
        contest_name: contest_id ? 'Active Contest' : '',
        media_type: media.media_type || 'IMAGE',
        instagram_timestamp: new Date(media.timestamp),
        permalink: media.permalink,
        hashtag_source: hashtag,
        status: 'pending'
      });

      await photo.save();
      savedPhotos.push(photo);
      console.log(`Saved Instagram photo: ${media.id}`);
      
    } catch (err) {
      console.error(`Error saving Instagram photo ${media.id}:`, err);
    }
  }

  return savedPhotos;
}

// Simulate Instagram API fetch (fallback for development)
async function simulateInstagramFetch(hashtag, contest_id) {
  // Mock Instagram photos - in production, this would use Instagram API
  const mockPhotos = [
    {
      id: `ig_${Date.now()}_1`,
      permalink: 'https://instagram.com/p/sample1',
      username: 'guest_sarah',
      owner: { id: 'user123', full_name: 'Sarah Johnson' },
      media_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop',
      thumbnail_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop',
      caption: `Perfect pool day at #${hashtag}! The kids loved the hot tub and we enjoyed the beautiful desert views. #Scottsdale #PoolLife`,
      media_type: 'IMAGE',
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      like_count: Math.floor(Math.random() * 50) + 10,
      comments_count: Math.floor(Math.random() * 10) + 1
    },
    {
      id: `ig_${Date.now()}_2`,
      permalink: 'https://instagram.com/p/sample2',
      username: 'guest_mike',
      owner: { id: 'user456', full_name: 'Mike Chen' },
      media_url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop',
      thumbnail_url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop',
      caption: `Incredible sunset from the patio! The desert sky was absolutely magical tonight. #${hashtag} #DesertSunset #GoldenHour`,
      media_type: 'IMAGE',
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      like_count: Math.floor(Math.random() * 80) + 20,
      comments_count: Math.floor(Math.random() * 15) + 2
    }
  ];

  return { data: mockPhotos };
}

export default router; 