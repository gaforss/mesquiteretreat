import mongoose from 'mongoose';
import InstagramPhoto from '../models/instagramPhoto.js';
import PhotoContest from '../models/photoContest.js';
import 'dotenv/config';

const resolvedMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function testInstagramIntegration() {
  try {
    if (!resolvedMongoUri) {
      console.error('No MongoDB URI provided');
      return;
    }

    await mongoose.connect(resolvedMongoUri);
    console.log('Connected to MongoDB');

    // Test fetching Instagram photos by hashtag
    console.log('\n🔍 Testing Instagram photo fetching...');
    
    const testHashtags = ['MesquiteRetreat', 'Scottsdale', 'DesertOasis'];
    
    for (const hashtag of testHashtags) {
      console.log(`\nFetching photos for #${hashtag}...`);
      
      try {
        const response = await fetch('http://localhost:3000/api/instagram/fetch-by-hashtag', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ hashtag })
        });
        
        const data = await response.json();
        
        if (data.ok) {
          console.log(`✅ Successfully fetched ${data.photos.length} photos for #${hashtag}`);
          console.log(`   Message: ${data.message}`);
        } else {
          console.log(`❌ Failed to fetch photos for #${hashtag}: ${data.error}`);
        }
      } catch (error) {
        console.log(`❌ Error fetching photos for #${hashtag}: ${error.message}`);
      }
    }

    // Test getting Instagram photos
    console.log('\n📸 Testing Instagram photos retrieval...');
    
    try {
      const response = await fetch('http://localhost:3000/api/instagram/photos?limit=5');
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Successfully retrieved ${data.photos.length} Instagram photos`);
        console.log(`   Total photos in database: ${data.total}`);
      } else {
        console.log(`❌ Failed to retrieve Instagram photos: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error retrieving Instagram photos: ${error.message}`);
    }

    // Test Instagram feed
    console.log('\n📱 Testing Instagram feed...');
    
    try {
      const response = await fetch('http://localhost:3000/api/instagram/feed');
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Successfully retrieved Instagram feed with ${data.photos.length} photos`);
      } else {
        console.log(`❌ Failed to retrieve Instagram feed: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error retrieving Instagram feed: ${error.message}`);
    }

    // Test hashtag statistics
    console.log('\n🏷️ Testing hashtag statistics...');
    
    try {
      const response = await fetch('http://localhost:3000/api/instagram/hashtags/stats');
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Successfully retrieved hashtag statistics`);
        console.log(`   Found ${data.hashtags.length} hashtags`);
        data.hashtags.forEach(tag => {
          console.log(`   #${tag._id}: ${tag.count} photos, ${tag.total_likes} likes`);
        });
      } else {
        console.log(`❌ Failed to retrieve hashtag statistics: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error retrieving hashtag statistics: ${error.message}`);
    }

    // Test Instagram statistics
    console.log('\n📊 Testing Instagram statistics...');
    
    try {
      const response = await fetch('http://localhost:3000/api/instagram/stats');
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Successfully retrieved Instagram statistics`);
        console.log(`   Total photos: ${data.stats.totalPhotos}`);
        console.log(`   Pending: ${data.stats.pendingPhotos}`);
        console.log(`   Approved: ${data.stats.approvedPhotos}`);
        console.log(`   Featured: ${data.stats.featuredPhotos}`);
        console.log(`   Total likes: ${data.stats.totalLikes}`);
        console.log(`   Total comments: ${data.stats.totalComments}`);
        console.log(`   Unique users: ${data.stats.uniqueUsers}`);
      } else {
        console.log(`❌ Failed to retrieve Instagram statistics: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error retrieving Instagram statistics: ${error.message}`);
    }

    console.log('\n🎉 Instagram integration test completed!');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3000/guest-photos.html to see the Instagram community page');
    console.log('2. Visit http://localhost:3000/admin-photo-contests.html to manage contests and moderate photos');
    console.log('3. Use the "Fetch Instagram Photos" feature in the admin panel to add more photos');

  } catch (error) {
    console.error('Error testing Instagram integration:', error);
  } finally {
    process.exit(0);
  }
}

// Helper function to make fetch requests (Node.js doesn't have fetch by default)
async function fetch(url, options = {}) {
  const https = await import('https');
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            json: () => Promise.resolve(jsonData)
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            json: () => Promise.resolve({ error: 'Invalid JSON response' })
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

testInstagramIntegration(); 