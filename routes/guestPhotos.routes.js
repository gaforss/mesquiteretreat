import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import GuestPhoto from '../models/guestPhoto.js';
import PhotoContest from '../models/photoContest.js';
import Subscriber from '../models/subscriber.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/photos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'guest-photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get active contests
router.get('/contests/active', async (req, res) => {
  try {
    const contests = await PhotoContest.find({
      status: 'active',
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() }
    }).sort({ is_featured: -1, created_at: -1 });
    
    res.json({ ok: true, contests });
  } catch (err) {
    console.error('Error fetching active contests:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contests' });
  }
});

// Get contest details
router.get('/contests/:contestId', async (req, res) => {
  try {
    const contest = await PhotoContest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ ok: false, error: 'Contest not found' });
    }
    
    // Get photos for this contest
    const photos = await GuestPhoto.find({
      contest_id: req.params.contestId,
      status: { $in: ['approved', 'featured'] }
    }).sort({ likes_count: -1, created_at: -1 }).limit(50);
    
    res.json({ ok: true, contest, photos });
  } catch (err) {
    console.error('Error fetching contest details:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contest details' });
  }
});

// Submit a photo
router.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const {
      guest_email,
      guest_name,
      guest_phone,
      caption,
      hashtags,
      contest_id,
      location_tag,
      trip_type,
      instagram_username,
      instagram_url,
      facebook_url
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Photo is required' });
    }

    if (!guest_email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    // Validate contest if provided
    let contest = null;
    if (contest_id) {
      contest = await PhotoContest.findById(contest_id);
      if (!contest || contest.status !== 'active') {
        return res.status(400).json({ ok: false, error: 'Invalid or inactive contest' });
      }
      
      // Check if contest is within date range
      const now = new Date();
      if (now < contest.start_date || now > contest.end_date) {
        return res.status(400).json({ ok: false, error: 'Contest is not currently accepting entries' });
      }
    }

    // Parse hashtags
    const parsedHashtags = hashtags ? hashtags.split(',').map(tag => tag.trim().replace('#', '')) : [];

    // Create photo record
    const photo = new GuestPhoto({
      guest_email: guest_email.toLowerCase(),
      guest_name: guest_name || '',
      guest_phone: guest_phone || '',
      photo_url: `/uploads/photos/${req.file.filename}`,
      photo_thumbnail: `/uploads/photos/thumb-${req.file.filename}`,
      caption: caption || '',
      hashtags: parsedHashtags,
      contest_id: contest_id || null,
      contest_name: contest ? contest.name : '',
      location_tag: location_tag || '',
      trip_type: trip_type || '',
      instagram_username: instagram_username || '',
      instagram_url: instagram_url || '',
      facebook_url: facebook_url || '',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'pending'
    });

    await photo.save();

    // Update contest statistics if applicable
    if (contest) {
      await PhotoContest.findByIdAndUpdate(contest_id, {
        $inc: { total_entries: 1 }
      });
    }

    res.json({ 
      ok: true, 
      photo_id: photo._id,
      message: 'Photo submitted successfully! It will be reviewed and approved shortly.'
    });

  } catch (err) {
    console.error('Error submitting photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to submit photo' });
  }
});

// Get photos for display (public)
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
    
    const photos = await GuestPhoto.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GuestPhoto.countDocuments(query);

    res.json({ 
      ok: true, 
      photos, 
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });

  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch photos' });
  }
});

// Like a photo
router.post('/photos/:photoId/like', async (req, res) => {
  try {
    const { guest_email } = req.body;
    
    if (!guest_email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    const photo = await GuestPhoto.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    // Increment likes count
    photo.likes_count += 1;
    await photo.save();

    res.json({ ok: true, likes_count: photo.likes_count });

  } catch (err) {
    console.error('Error liking photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to like photo' });
  }
});

// Get Instagram feed integration
router.get('/instagram/feed', async (req, res) => {
  try {
    // This would integrate with Instagram Basic Display API
    // For now, return photos that have Instagram URLs
    const instagramPhotos = await GuestPhoto.find({
      instagram_url: { $exists: true, $ne: '' },
      status: { $in: ['approved', 'featured'] }
    }).sort({ created_at: -1 }).limit(12);

    res.json({ ok: true, photos: instagramPhotos });

  } catch (err) {
    console.error('Error fetching Instagram feed:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Instagram feed' });
  }
});

// Get hashtag statistics
router.get('/hashtags/stats', async (req, res) => {
  try {
    const stats = await GuestPhoto.aggregate([
      { $match: { status: { $in: ['approved', 'featured'] } } },
      { $unwind: '$hashtags' },
      { $group: {
        _id: '$hashtags',
        count: { $sum: 1 },
        total_likes: { $sum: '$likes_count' }
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

// Get contest winners
router.get('/contests/:contestId/winners', async (req, res) => {
  try {
    const contest = await PhotoContest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ ok: false, error: 'Contest not found' });
    }

    const winnerPhotos = await GuestPhoto.find({
      _id: { $in: contest.winners.map(w => w.photo_id) },
      status: { $in: ['approved', 'featured'] }
    });

    res.json({ ok: true, winners: contest.winners, photos: winnerPhotos });

  } catch (err) {
    console.error('Error fetching contest winners:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contest winners' });
  }
});

export default router; 