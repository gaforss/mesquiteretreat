import mongoose from 'mongoose';
import PhotoContest from '../models/photoContest.js';
import 'dotenv/config';

const resolvedMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function createSampleContest() {
  try {
    if (!resolvedMongoUri) {
      console.error('No MongoDB URI provided');
      return;
    }

    await mongoose.connect(resolvedMongoUri);
    console.log('Connected to MongoDB');

    // Create a sample contest
    const sampleContest = new PhotoContest({
      name: "Summer Pool Contest 2025",
      description: "Share your best pool and hot tub moments at Mesquite Retreat! Capture the perfect sunset, family fun, or relaxing moments by the water.",
      hashtag: "MesquiteSummer",
      secondary_hashtags: ["Scottsdale", "PoolLife", "DesertOasis"],
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      winner_announcement_date: new Date('2025-12-15'),
      rules: [
        "Photos must be taken at Mesquite Retreat on Oak",
        "Must include #MesquiteSummer hashtag",
        "One entry per guest per contest period",
        "Photos must be family-friendly and appropriate",
        "Must be original photos taken by the guest"
      ],
      prizes: [
        {
          rank: 1,
          title: "1st Place",
          description: "Free 2-night stay at Mesquite Retreat",
          value: 800,
          type: "free_night"
        },
        {
          rank: 2,
          title: "Runner Up",
          description: "50% off next stay (up to $400 value)",
          value: 400,
          type: "discount"
        },
        {
          rank: 3,
          title: "3rd Place",
          description: "Exclusive vendor partner discounts",
          value: 200,
          type: "experience"
        }
      ],
      max_entries_per_guest: 1,
      required_hashtags: ["MesquiteSummer"],
      required_location_tags: ["pool", "garden"],
      judging_criteria: [
        {
          name: "Creativity",
          weight: 3,
          description: "How unique and creative is the photo?"
        },
        {
          name: "Quality",
          weight: 2,
          description: "Technical quality and composition"
        },
        {
          name: "Engagement",
          weight: 2,
          description: "How well does it capture the Mesquite Retreat experience?"
        },
        {
          name: "Story",
          weight: 1,
          description: "Does the photo tell a compelling story?"
        }
      ],
      auto_share_to_social: true,
      status: "active",
      is_featured: true,
      created_by: "admin"
    });

    await sampleContest.save();
    console.log('Sample contest created successfully:', sampleContest._id);

    // Create another contest for variety
    const winterContest = new PhotoContest({
      name: "Desert Sunset Contest",
      description: "Capture the magical desert sunsets from our property. Share the most stunning sunset views and golden hour moments.",
      hashtag: "MesquiteSunset",
      secondary_hashtags: ["DesertSunset", "GoldenHour", "Scottsdale"],
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      winner_announcement_date: new Date('2025-12-15'),
      rules: [
        "Photos must be taken from Mesquite Retreat property",
        "Must include #MesquiteSunset hashtag",
        "Focus on sunset and golden hour photography",
        "One entry per guest per contest period"
      ],
      prizes: [
        {
          rank: 1,
          title: "Sunset Master",
          description: "Free 1-night stay + professional photo session",
          value: 600,
          type: "free_night"
        },
        {
          rank: 2,
          title: "Golden Hour Winner",
          description: "25% off next stay",
          value: 200,
          type: "discount"
        }
      ],
      max_entries_per_guest: 2,
      required_hashtags: ["MesquiteSunset"],
      required_location_tags: ["sunset", "garden", "patio"],
      judging_criteria: [
        {
          name: "Beauty",
          weight: 4,
          description: "How stunning is the sunset capture?"
        },
        {
          name: "Composition",
          weight: 3,
          description: "Photographic composition and framing"
        },
        {
          name: "Timing",
          weight: 2,
          description: "Perfect timing for golden hour"
        },
        {
          name: "Location",
          weight: 1,
          description: "How well does it showcase our property?"
        }
      ],
      auto_share_to_social: true,
      status: "active",
      is_featured: false,
      created_by: "admin"
    });

    await winterContest.save();
    console.log('Winter contest created successfully:', winterContest._id);

    console.log('All sample contests created!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating sample contests:', error);
    process.exit(1);
  }
}

createSampleContest(); 