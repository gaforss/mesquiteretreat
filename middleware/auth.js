import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-secret';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
const isHttps = /^https:\/\//i.test(siteUrl);

export function signAdminToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function getCookieOpts() {
  return { httpOnly: true, sameSite: 'lax', secure: isHttps, path: '/' };
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_jwt || String(req.headers['authorization']||'').replace(/^Bearer\s+/i,'');
  if (!token) return res.status(401).json({ ok:false, error: 'Unauthorized' });
  try { req.admin = verifyAdminToken(token); return next(); } catch { return res.status(401).json({ ok:false, error:'Unauthorized' }); }
}

