import mongoose from 'mongoose';

const guestPhotoSchema = new mongoose.Schema({
  // Guest information
  guest_email: { type: String, required: true, index: true },
  guest_name: { type: String, default: '' },
  guest_phone: { type: String, default: '' },
  
  // Photo details
  photo_url: { type: String, required: true },
  photo_thumbnail: { type: String, default: '' },
  caption: { type: String, default: '' },
  hashtags: [{ type: String, index: true }],
  
  // Social media integration
  instagram_post_id: { type: String, default: '' },
  instagram_username: { type: String, default: '' },
  instagram_url: { type: String, default: '' },
  facebook_post_id: { type: String, default: '' },
  facebook_url: { type: String, default: '' },
  
  // Contest and engagement
  contest_id: { type: String, index: true },
  contest_name: { type: String, default: '' },
  likes_count: { type: Number, default: 0 },
  views_count: { type: Number, default: 0 },
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
  
  // Location and context
  location_tag: { type: String, default: '' }, // e.g., 'pool', 'garden', 'living-room'
  trip_type: { type: String, default: '' }, // e.g., 'family', 'golf', 'work'
  stay_dates: {
    check_in: { type: Date },
    check_out: { type: Date }
  },
  
  // Metadata
  device_info: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  
  // Timestamps
  submitted_at: { type: Date, default: Date.now },
  featured_at: { type: Date },
  winner_announced_at: { type: Date }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexes for better query performance
guestPhotoSchema.index({ status: 1, created_at: -1 });
guestPhotoSchema.index({ contest_id: 1, likes_count: -1 });
guestPhotoSchema.index({ hashtags: 1, status: 1 });
guestPhotoSchema.index({ is_winner: 1, contest_id: 1 });

const GuestPhoto = mongoose.models.GuestPhoto || mongoose.model('GuestPhoto', guestPhotoSchema, 'guest_photos');

export default GuestPhoto; 