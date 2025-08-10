import mongoose from 'mongoose';
import GuestPhoto from '../models/guestPhoto.js';
import PhotoContest from '../models/photoContest.js';
import 'dotenv/config';

const resolvedMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function createSamplePhotos() {
  try {
    if (!resolvedMongoUri) {
      console.error('No MongoDB URI provided');
      return;
    }

    await mongoose.connect(resolvedMongoUri);
    console.log('Connected to MongoDB');

    // Get the first contest
    const contest = await PhotoContest.findOne({ status: 'active' });
    if (!contest) {
      console.log('No active contest found. Please create a contest first.');
      return;
    }

    // Sample photos data
    const samplePhotos = [
      {
        guest_email: 'sarah.johnson@email.com',
        guest_name: 'Sarah Johnson',
        guest_phone: '(555) 123-4567',
        photo_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop',
        caption: 'Perfect pool day with the family! The kids loved the hot tub and we enjoyed the beautiful desert views.',
        hashtags: ['MesquiteSummer', 'PoolLife', 'FamilyTime', 'Scottsdale'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'pool',
        trip_type: 'family',
        instagram_username: '@sarahjohnson',
        instagram_url: 'https://instagram.com/p/sample1',
        likes_count: 24,
        views_count: 156,
        status: 'approved',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        guest_email: 'mike.chen@email.com',
        guest_name: 'Mike Chen',
        guest_phone: '(555) 234-5678',
        photo_url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop',
        caption: 'Incredible sunset from the patio. The desert sky was absolutely magical tonight!',
        hashtags: ['MesquiteSummer', 'DesertSunset', 'GoldenHour', 'Scottsdale'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'sunset',
        trip_type: 'romantic',
        instagram_username: '@mikechen',
        instagram_url: 'https://instagram.com/p/sample2',
        likes_count: 42,
        views_count: 289,
        status: 'featured',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        guest_email: 'emily.rodriguez@email.com',
        guest_name: 'Emily Rodriguez',
        guest_phone: '(555) 345-6789',
        photo_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
        caption: 'Morning coffee on the putting green. Such a peaceful way to start the day!',
        hashtags: ['MesquiteSummer', 'GolfLife', 'MorningRoutine', 'Scottsdale'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'putting',
        trip_type: 'golf',
        instagram_username: '@emilyrodriguez',
        instagram_url: 'https://instagram.com/p/sample3',
        likes_count: 18,
        views_count: 94,
        status: 'approved',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        guest_email: 'david.thompson@email.com',
        guest_name: 'David Thompson',
        guest_phone: '(555) 456-7890',
        photo_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
        caption: 'BBQ night with friends! The outdoor kitchen and dining area are perfect for entertaining.',
        hashtags: ['MesquiteSummer', 'BBQ', 'Friends', 'OutdoorDining'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'garden',
        trip_type: 'friends',
        instagram_username: '@davidthompson',
        instagram_url: 'https://instagram.com/p/sample4',
        likes_count: 31,
        views_count: 203,
        status: 'approved',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        guest_email: 'lisa.wang@email.com',
        guest_name: 'Lisa Wang',
        guest_phone: '(555) 567-8901',
        photo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
        caption: 'Working remotely with this amazing view! The dedicated workspace is perfect for productivity.',
        hashtags: ['MesquiteSummer', 'WorkFromHome', 'Productivity', 'DesertView'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'living',
        trip_type: 'work',
        instagram_username: '@lisawang',
        instagram_url: 'https://instagram.com/p/sample5',
        likes_count: 15,
        views_count: 87,
        status: 'approved',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        guest_email: 'james.martinez@email.com',
        guest_name: 'James Martinez',
        guest_phone: '(555) 678-9012',
        photo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        photo_thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
        caption: 'Evening relaxation by the fire pit. The perfect way to end a day in Scottsdale!',
        hashtags: ['MesquiteSummer', 'FirePit', 'Relaxation', 'Evening'],
        contest_id: contest._id,
        contest_name: contest.name,
        location_tag: 'garden',
        trip_type: 'romantic',
        instagram_username: '@jamesmartinez',
        instagram_url: 'https://instagram.com/p/sample6',
        likes_count: 28,
        views_count: 175,
        status: 'approved',
        moderated_by: 'admin',
        moderated_at: new Date(),
        submitted_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      }
    ];

    // Create photos
    for (const photoData of samplePhotos) {
      const photo = new GuestPhoto(photoData);
      await photo.save();
      console.log(`Created photo: ${photo.caption.substring(0, 50)}...`);
    }

    // Update contest statistics
    await PhotoContest.findByIdAndUpdate(contest._id, {
      total_entries: samplePhotos.length,
      total_participants: new Set(samplePhotos.map(p => p.guest_email)).size,
      total_likes: samplePhotos.reduce((sum, p) => sum + p.likes_count, 0)
    });

    console.log(`Created ${samplePhotos.length} sample photos!`);
    console.log('Contest statistics updated.');
    process.exit(0);

  } catch (error) {
    console.error('Error creating sample photos:', error);
    process.exit(1);
  }
}

createSamplePhotos(); 