import mongoose from 'mongoose';

const photoContestSchema = new mongoose.Schema({
  // Contest details
  name: { type: String, required: true },
  description: { type: String, default: '' },
  hashtag: { type: String, required: true, unique: true, index: true },
  secondary_hashtags: [{ type: String }],
  
  // Contest period
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  winner_announcement_date: { type: Date },
  
  // Contest rules and prizes
  rules: [{ type: String }],
  prizes: [{
    rank: { type: Number, required: true },
    title: { type: String, required: true }, // e.g., "1st Place", "Runner Up"
    description: { type: String, required: true },
    value: { type: Number, default: 0 },
    type: { type: String, enum: ['free_night', 'discount', 'gift_card', 'experience'], default: 'free_night' }
  }],
  
  // Entry requirements
  max_entries_per_guest: { type: Number, default: 1 },
  required_hashtags: [{ type: String }],
  required_location_tags: [{ type: String }], // e.g., ['pool', 'garden']
  
  // Judging criteria
  judging_criteria: [{
    name: { type: String, required: true }, // e.g., "Creativity", "Quality", "Engagement"
    weight: { type: Number, default: 1, min: 0, max: 10 },
    description: { type: String, default: '' }
  }],
  
  // Social media integration
  instagram_story_highlights: [{ type: String }], // Instagram story highlight IDs
  facebook_album_id: { type: String, default: '' },
  auto_share_to_social: { type: Boolean, default: true },
  
  // Status and moderation
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'ended', 'judging', 'winners_announced'], 
    default: 'draft' 
  },
  is_featured: { type: Boolean, default: false },
  
  // Statistics
  total_entries: { type: Number, default: 0 },
  total_participants: { type: Number, default: 0 },
  total_likes: { type: Number, default: 0 },
  total_shares: { type: Number, default: 0 },
  
  // Winners
  winners: [{
    rank: { type: Number, required: true },
    photo_id: { type: String, required: true },
    guest_email: { type: String, required: true },
    guest_name: { type: String, default: '' },
    prize_claimed: { type: Boolean, default: false },
    prize_claimed_at: { type: Date },
    announced_at: { type: Date, default: Date.now }
  }],
  
  // Admin fields
  created_by: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexes
photoContestSchema.index({ status: 1, start_date: -1 });
photoContestSchema.index({ is_featured: 1, status: 1 });
photoContestSchema.index({ end_date: 1, status: 1 });

const PhotoContest = mongoose.models.PhotoContest || mongoose.model('PhotoContest', photoContestSchema, 'photo_contests');

export default PhotoContest; 