import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';
import { sendDiscountCodeEmail, sendWinnerNotificationEmail } from '../services/email.service.js';
import GuestPhoto from '../models/guestPhoto.js';
import PhotoContest from '../models/photoContest.js';

const router = Router();

router.post('/broadcast', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { subject, message } = req.body || {};
    if (!subject || !message) return res.status(400).json({ ok:false, error:'Missing subject or message' });
    const count = await Subscriber.countDocuments({});
    // NOTE: For simplicity, this endpoint does not send emails. Integrate your mailer here if desired.
    return res.json({ ok:true, count });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/discount', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Missing email' });
    const code = 'DISC-' + Math.random().toString(36).slice(2,8).toUpperCase();
    await Subscriber.updateOne({ email: email.toLowerCase() }, { $set: { discount_code: code, is_returning: true } });
    
    // Send discount code email
    const result = await sendDiscountCodeEmail(email.toLowerCase(), code);
    if (!result.success) {
      console.error('Failed to send discount code email:', result.error);
    }
    
    return res.json({ ok:true, email, discountCode: code, emailSent: result.success });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/pick-winner', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { promotionName = 'Giveaway' } = req.body || {};
    const rows = await Subscriber.find({ confirmed: true }).select({ email: 1 }).lean();
    if (!rows.length) return res.status(400).json({ ok:false, error:'No confirmed entrants' });
    const winner = rows[Math.floor(Math.random() * rows.length)];
    
    // Send winner notification email
    const result = await sendWinnerNotificationEmail(winner.email, promotionName);
    if (!result.success) {
      console.error('Failed to send winner notification email:', result.error);
    }
    
    return res.json({ 
      ok: true, 
      winnerEmail: winner.email, 
      totalEntrants: rows.length, 
      emailSent: result.success 
    });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Photo Contest Management Routes

// Create new contest
router.post('/photo-contests', async (req, res) => {
  try {
    const {
      name,
      description,
      hashtag,
      secondary_hashtags,
      start_date,
      end_date,
      winner_announcement_date,
      rules,
      prizes,
      max_entries_per_guest,
      required_hashtags,
      required_location_tags,
      judging_criteria,
      status,
      is_featured
    } = req.body;

    // Parse rules from text
    const parsedRules = rules ? rules.split('\n').filter(rule => rule.trim()) : [];
    
    // Parse prizes from JSON
    let parsedPrizes = [];
    try {
      parsedPrizes = prizes ? JSON.parse(prizes) : [];
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid prizes JSON format' });
    }

    // Parse judging criteria from JSON
    let parsedJudgingCriteria = [];
    try {
      parsedJudgingCriteria = judging_criteria ? JSON.parse(judging_criteria) : [];
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid judging criteria JSON format' });
    }

    const contest = new PhotoContest({
      name,
      description,
      hashtag,
      secondary_hashtags: secondary_hashtags ? secondary_hashtags.split(',').map(tag => tag.trim()) : [],
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      winner_announcement_date: winner_announcement_date ? new Date(winner_announcement_date) : null,
      rules: parsedRules,
      prizes: parsedPrizes,
      max_entries_per_guest: parseInt(max_entries_per_guest) || 1,
      required_hashtags: required_hashtags ? required_hashtags.split(',').map(tag => tag.trim()) : [],
      required_location_tags: required_location_tags ? required_location_tags.split(',').map(tag => tag.trim()) : [],
      judging_criteria: parsedJudgingCriteria,
      status: status || 'draft',
      is_featured: !!is_featured,
      created_by: 'admin'
    });

    await contest.save();
    res.json({ ok: true, contest_id: contest._id });

  } catch (err) {
    console.error('Error creating contest:', err);
    res.status(500).json({ ok: false, error: 'Failed to create contest' });
  }
});

// Get all contests for admin
router.get('/photo-contests', async (req, res) => {
  try {
    const contests = await PhotoContest.find().sort({ created_at: -1 });
    res.json({ ok: true, contests });
  } catch (err) {
    console.error('Error fetching contests:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contests' });
  }
});

// Update contest
router.put('/photo-contests/:contestId', async (req, res) => {
  try {
    const contestId = req.params.contestId;
    const updateData = req.body;

    // Parse JSON fields if provided
    if (updateData.prizes) {
      try {
        updateData.prizes = JSON.parse(updateData.prizes);
      } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid prizes JSON format' });
      }
    }

    if (updateData.judging_criteria) {
      try {
        updateData.judging_criteria = JSON.parse(updateData.judging_criteria);
      } catch (e) {
        return res.status(400).json({ ok: false, error: 'Invalid judging criteria JSON format' });
      }
    }

    const contest = await PhotoContest.findByIdAndUpdate(contestId, updateData, { new: true });
    
    if (!contest) {
      return res.status(404).json({ ok: false, error: 'Contest not found' });
    }

    res.json({ ok: true, contest });

  } catch (err) {
    console.error('Error updating contest:', err);
    res.status(500).json({ ok: false, error: 'Failed to update contest' });
  }
});

// Delete contest
router.delete('/photo-contests/:contestId', async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    // Check if contest has photos
    const photoCount = await GuestPhoto.countDocuments({ contest_id: contestId });
    if (photoCount > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: `Cannot delete contest with ${photoCount} photos. Please remove photos first.` 
      });
    }

    await PhotoContest.findByIdAndDelete(contestId);
    res.json({ ok: true });

  } catch (err) {
    console.error('Error deleting contest:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete contest' });
  }
});

// Get photos for moderation
router.get('/guest-photos/moderation', async (req, res) => {
  try {
    const { 
      status = 'pending',
      contest_id,
      location_tag,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (contest_id) {
      query.contest_id = contest_id;
    }
    
    if (location_tag) {
      query.location_tag = location_tag;
    }

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
    console.error('Error fetching photos for moderation:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch photos' });
  }
});

// Moderate photo
router.put('/guest-photos/:photoId/moderate', async (req, res) => {
  try {
    const { photoId } = req.params;
    const { status, moderation_notes } = req.body;

    const photo = await GuestPhoto.findByIdAndUpdate(photoId, {
      status,
      moderation_notes,
      moderated_by: 'admin',
      moderated_at: new Date()
    }, { new: true });

    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    res.json({ ok: true, photo });

  } catch (err) {
    console.error('Error moderating photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to moderate photo' });
  }
});

// Feature photo
router.put('/guest-photos/:photoId/feature', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photo = await GuestPhoto.findByIdAndUpdate(photoId, {
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
    console.error('Error featuring photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to feature photo' });
  }
});

// Delete photo
router.delete('/guest-photos/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const photo = await GuestPhoto.findByIdAndDelete(photoId);
    
    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    res.json({ ok: true });

  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete photo' });
  }
});

// Get photo statistics
router.get('/guest-photos/stats', async (req, res) => {
  try {
    const [
      totalPhotos,
      pendingPhotos,
      approvedPhotos,
      featuredPhotos,
      totalLikes,
      totalViews,
      uniqueGuests
    ] = await Promise.all([
      GuestPhoto.countDocuments(),
      GuestPhoto.countDocuments({ status: 'pending' }),
      GuestPhoto.countDocuments({ status: 'approved' }),
      GuestPhoto.countDocuments({ status: 'featured' }),
      GuestPhoto.aggregate([{ $group: { _id: null, total: { $sum: '$likes_count' } } }]),
      GuestPhoto.aggregate([{ $group: { _id: null, total: { $sum: '$views_count' } } }]),
      GuestPhoto.distinct('guest_email')
    ]);

    res.json({
      ok: true,
      stats: {
        totalPhotos,
        pendingPhotos,
        approvedPhotos,
        featuredPhotos,
        totalLikes: totalLikes[0]?.total || 0,
        totalViews: totalViews[0]?.total || 0,
        uniqueGuests: uniqueGuests.length
      }
    });

  } catch (err) {
    console.error('Error fetching photo stats:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch photo statistics' });
  }
});

export default router;

