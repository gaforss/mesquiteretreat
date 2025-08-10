import mongoose from 'mongoose';

const instagramPhotoSchema = new mongoose.Schema({
  // Instagram data
  instagram_id: { type: String, required: true, unique: true, index: true },
  instagram_url: { type: String, required: true },
  instagram_username: { type: String, required: true },
  instagram_user_id: { type: String, required: true },
  instagram_user_full_name: { type: String, default: '' },
  instagram_user_profile_pic: { type: String, default: '' },
  
  // Photo details
  photo_url: { type: String, required: true },
  photo_thumbnail: { type: String, default: '' },
  caption: { type: String, default: '' },
  hashtags: [{ type: String, index: true }],
  
  // Instagram metrics
  likes_count: { type: Number, default: 0 },
  comments_count: { type: Number, default: 0 },
  views_count: { type: Number, default: 0 },
  
  // Contest and engagement
  contest_id: { type: String, index: true },
  contest_name: { type: String, default: '' },
  is_winner: { type: Boolean, default: false },
  winner_prize: { type: String, default: '' },
  
  // Moderation and status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'featured'], 
    default: 'pending' 
  },
  moderated_by: { type: String, default: '' },
  moderated_at: { type: Date },
  moderation_notes: { type: String, default: '' },
  
  // Location and context (auto-detected or manually set)
  location_tag: { type: String, default: '' }, // e.g., 'pool', 'garden', 'living-room'
  trip_type: { type: String, default: '' }, // e.g., 'family', 'golf', 'work'
  
  // Instagram metadata
  media_type: { type: String, enum: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'], default: 'IMAGE' },
  instagram_timestamp: { type: Date, required: true },
  permalink: { type: String, required: true },
  
  // Fetch metadata
  fetched_at: { type: Date, default: Date.now },
  fetch_source: { type: String, default: 'hashtag' }, // 'hashtag', 'manual', 'api'
  hashtag_source: { type: String, default: '' }, // which hashtag this was found from
  
  // Timestamps
  featured_at: { type: Date },
  winner_announced_at: { type: Date }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexes for better query performance
instagramPhotoSchema.index({ status: 1, created_at: -1 });
instagramPhotoSchema.index({ contest_id: 1, likes_count: -1 });
instagramPhotoSchema.index({ hashtags: 1, status: 1 });
instagramPhotoSchema.index({ is_winner: 1, contest_id: 1 });
instagramPhotoSchema.index({ instagram_timestamp: -1 });
instagramPhotoSchema.index({ hashtag_source: 1, instagram_timestamp: -1 });

const InstagramPhoto = mongoose.models.InstagramPhoto || mongoose.model('InstagramPhoto', instagramPhotoSchema, 'instagram_photos');

export default InstagramPhoto; 