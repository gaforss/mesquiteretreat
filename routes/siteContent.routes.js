import { Router } from 'express';
import SiteContent from '../models/siteContent.js';
import mongoose from 'mongoose';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

function getDefaultContent(){
  return {
    key: 'default',
    property_name: 'The Mesquite Retreat on Oak',
    hero_title: 'The Mesquite Retreat on Oak',
    hero_subtitle: 'Scottsdale, AZ — 3 bedrooms · 2 baths · Sleeps 6',
    hero_badge: 'Guest favorite · 5.0 (12)',
    badge_title: 'Guest favorite',
    badge_description: 'One of the most loved homes on Airbnb, according to guests',
    rating_value: 5.0,
    reviews_count: 12,
    host_line: 'Hosted by Travli Hospitality · Superhost · 9 years hosting',
    show_superhost_pill: true,
    show_top_percent_pill: true,
    highlights: [
      { title: 'Top 5% of homes', description: 'This home is highly ranked based on ratings, reviews, and reliability.' },
      { title: 'Exceptional check-in experience', description: 'Recent guests gave the check-in process a 5-star rating.' },
      { title: 'Peace and quiet', description: 'Guests say this home is in a quiet area.' }
    ],
    hero_image_url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/63811802-34d9-4987-8bd7-7395421b7648.jpeg',
    book_url: 'https://www.airbnb.com/rooms/1310467447728284655',
    features: [
      { emoji: '🛁', title: '2 Modern Bathrooms', subtitle: 'Sparkling clean, fully stocked' },
      { emoji: '🍳', title: "Chef's Kitchen", subtitle: 'Stainless steel appliances, wine/coffee bar' },
      { emoji: '📺', title: 'Smart TVs & Fast Wi-Fi', subtitle: 'Chic decor throughout' },
      { emoji: '🔥', title: 'Heated Pool & Hot Tub', subtitle: 'Firepit lounge' },
      { emoji: '⛳', title: 'Private Putting Green', subtitle: 'Backyard entertainment' },
      { emoji: '🍽️', title: 'Covered Patio', subtitle: 'Dining & BBQ area' }
    ],
    gallery: [
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/3fff9ca9-4d3d-4baa-b267-613fb1550be8.jpeg', alt: 'Modern living room with luxe finishes' },
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/106bf015-98ca-4743-a6f8-0b148a361b8c.jpeg', alt: 'Updated kitchen with stainless appliances' },
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/ca824749-585f-48e9-a187-c668ca23876d.jpeg', alt: 'Primary bedroom with king bed' },
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/97ba340f-876c-4bee-bb8a-b46c23fb0ff8.jpeg', alt: 'Pool, hot tub, patio TV and putting green' },
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/0841e224-efbe-4e6e-a9f8-ae5350a6aa85.jpeg', alt: 'Open concept dining and living' },
      { url: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1310467447728284655/original/18b7447f-d610-4165-a2f2-6a5ee7792a3e.jpeg', alt: 'Guest bedroom with queen bed' }
    ],
    reviews: [
      { name: 'Jennifer', text: 'The place was very cute and comfortable in a nice area... Would definitely stay here again and recommend to family and friends!!', stars: 5 },
      { name: 'Natalia', text: 'Our family had a wonderful stay!... The backyard was amazing and provided many activities... beautifully clean.', stars: 5 },
      { name: 'Brooks', text: 'We had a fantastic stay. Clean, comfortable, and well‑equipped... host was friendly and responsive.', stars: 5 },
    ],
    amenities: [
      'Private pool (heat optional)', 'Hot tub', 'Fire pit lounge', '3‑hole putting green', 'Fully stocked kitchen',
      'Coffee & wine bar', 'Dedicated workspace', 'Fast Wi‑Fi', 'Washer & dryer', 'Patio with TV & BBQ grill',
      'Free parking', 'Single‑level home', 'Prime location - minutes to Old Town, Fashion Square & golf'
    ],
    good_to_know: [
      'No animals due to severe allergies (Airbnb policy exemption).',
      'Pool heat available for $75/night or $400/week (request 72h before check‑in).',
      'Pool use & safety waiver required before check‑in.',
      'No parties or events. Quiet, residential area.',
      'Exterior security cameras at entry, garage, and side gate.',
      'Noise/occupancy sensor monitors decibel levels only.',
      'Pack‑N‑Play and highchair available on request.',
      'Scottsdale License #2036818 · TPT #21589672'
    ],
    details_tabs: {
      home: {
        paragraph: 'A modern Scottsdale oasis designed for relaxing and entertaining: open‑concept living with a wine & coffee bar, a fully stocked kitchen, and stylish bedrooms. Step outside to a private resort backyard featuring a heated pool, hot tub, firepit lounge, covered patio with TV & dining, BBQ, and a 3‑hole putting green. Minutes to Old Town, top golf courses, Fashion Square, and the best dining in Scottsdale.',
        bullets: [
          'Heated pool & hot tub • Firepit • Patio TV & dining • BBQ',
          '3 stylish bedrooms, 2 full baths • Hotel‑quality linens',
          'Dedicated workspace • Fast Wi‑Fi • Washer & dryer'
        ],
        note: ''
      },
      area: {
        paragraph: 'You’ll be close to everything that makes Scottsdale special. Start in Old Town for art walks, dining, and nightlife; tee off at world‑class courses (TPC, Troon, Talking Stick); then unwind at spa resorts or hike Camelback and McDowell Sonoran Preserve. Families love the Phoenix Zoo, OdySea Aquarium, and spring training baseball. End your day poolside at home with a perfect desert sunset.',
        bullets: [
          'Old Town Scottsdale: 10–15 min',
          'Golf: TPC, Talking Stick, Troon, Papago — easy drives',
          'Shopping & dining: Fashion Square, Kierland Commons'
        ],
        note: ''
      },
      value: {
        paragraph: 'In Scottsdale, extra bedrooms are a premium. A four‑bedroom layout unlocks flexibility: families can spread out, golf foursomes get private rooms, and multi‑generational or friends’ trips gain comfort without booking multiple homes. That means better sleep, easier mornings, and real savings versus reserving two separate properties.',
        bullets: [
          'Ideal for families, golf trips, and work‑friendly stays',
          'Private rooms for everyone • More storage • Better privacy',
          'One destination hub close to courses, dining, and Old Town'
        ],
        note: 'Tip: Add extra nights to extend your stay for a full long‑weekend experience.'
      }
    }
  };
}

router.get('/site-content', async (_req, res) => {
  try{
    // TEMPORARILY FORCE DEFAULTS TO UPDATE FEATURES - IGNORE DATABASE
    const defaults = getDefaultContent();
    return res.json({ ok:true, content: defaults });
  }catch(err){
    // On error, still serve defaults to keep the public site functional
    return res.json({ ok:true, content: getDefaultContent() });
  }
});

router.put('/site-content', requireAdmin, async (req, res) => {
  try{
    const payload = req.body || {};
    const update = { ...payload, key: 'default' };
    const doc = await SiteContent.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { new: true, upsert: true }
    ).lean();
    return res.json({ ok:true, content: doc });
  }catch(err){
    return res.status(500).json({ ok:false, error: 'Server error' });
  }
});

export default router;

