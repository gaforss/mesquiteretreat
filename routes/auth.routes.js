import { Router } from 'express';
import { getCookieOpts, signAdminToken, requireAdmin } from '../middleware/auth.js';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'change-me';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ ok:false, error:'Invalid credentials' });
  const token = signAdminToken({ u: ADMIN_USER });
  res.cookie('admin_jwt', token, { ...getCookieOpts(), maxAge: 12 * 60 * 60 * 1000 });
  return res.json({ ok:true, token });
});

router.post('/logout', requireAdmin, (_req, res) => {
  res.clearCookie('admin_jwt', getCookieOpts());
  return res.json({ ok:true });
});

router.get('/me', requireAdmin, (req, res) => {
  return res.json({ ok:true, user: req.admin?.u || 'admin' });
});

export default router;

