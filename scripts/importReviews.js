// Import real Airbnb-style reviews into CMS via API
// Usage: node scripts/importReviews.js

const SITE = 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'change-me';

async function main(){
  const reviews = [
    { name: 'Larissa', stars: 5, text: 'Overall great stay! Beautifully decorated, clean, and calming. Loved mini golf, corn hole, and games. Pool was perfect temp. 10 minutes to Scottsdale Mall with lots to do and great food.' },
    { name: 'Jennifer', stars: 5, text: 'Very cute and comfortable in a nice area. Host was extremely responsive and helpful. Inside/out was very clean. Hot tub and pool in great shape. Would definitely stay again and recommend to family and friends!' },
    { name: 'Natalia', stars: 5, text: 'Wonderful stay! Backyard was amazing with activities all day. House had everything we needed and was beautifully clean. We would love to stay again.' },
    { name: 'Terri', stars: 5, text: 'Lovely home in a perfect location! Spotlessly clean with everything we needed. Backyard with pool, hot tub, and fire table was a huge plus. Host was the most responsive we have ever had. We would not hesitate to stay again.' },
    { name: 'Tiffany', stars: 5, text: 'Beautiful home exactly as described! Clean and quiet. Easy to deal with and very accommodating. Would stay here again!' },
    { name: 'Ryan', stars: 5, text: 'Great time. House was in great shape and the pool was well maintained.' },
    { name: 'Brooks', stars: 5, text: 'Fantastic stay—clean, comfortable, and well‑equipped. Convenient location and friendly, responsive host. Highly recommend. We’d love to come back again!' },
    { name: 'Fernando', stars: 5, text: 'Amazing place. Perfect location—close to a park and Old Town Scottsdale. We will definitely come back to continue exploring.' },
    { name: 'Carolyn and Rich', stars: 5, text: 'Clean and convenient.' },
    { name: 'Bridget', stars: 5, text: 'Very responsive and friendly! Willing to help with any problems we encountered.' },
    { name: 'Josh', stars: 5, text: 'Beautiful and clean home, decorated nicely with an at‑home feel. Recommended for a quiet stay within 10 minutes of Scottsdale.' },
    { name: 'Amanda', stars: 5, text: 'Wonderful house and host.' }
  ];

  // Login
  const loginRes = await fetch(`${SITE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    redirect: 'manual'
  });
  const setCookie = loginRes.headers.get('set-cookie') || '';
  if (!setCookie) throw new Error('Login failed: no cookie');
  const cookie = setCookie.split(';')[0];

  // Update site content (merge only reviews)
  const putRes = await fetch(`${SITE}/api/site-content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ reviews })
  });
  const putJson = await putRes.json();
  if (!putJson.ok) throw new Error('PUT failed');

  // Verify
  const getRes = await fetch(`${SITE}/api/site-content`, { headers: { cookie } });
  const getJson = await getRes.json();
  const count = (getJson.content?.reviews || []).length;
  console.log(JSON.stringify({ ok: true, count }, null, 2));
}

main().catch(err=>{ console.error(err); process.exit(1); });

