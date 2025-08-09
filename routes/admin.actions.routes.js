import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';

const router = Router();

router.post('/discount', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Missing email' });
    const code = 'DISC-' + Math.random().toString(36).slice(2,8).toUpperCase();
    await Subscriber.updateOne({ email: email.toLowerCase() }, { $set: { discount_code: code, is_returning: true } });
    return res.json({ ok:true, email, discountCode: code });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/pick-winner', adminLimiter, requireAdmin, async (_req, res) => {
  try{
    const rows = await Subscriber.find({ confirmed: true }).select({ email: 1 }).lean();
    if (!rows.length) return res.status(400).json({ ok:false, error:'No confirmed entrants' });
    const winner = rows[Math.floor(Math.random() * rows.length)];
    return res.json({ ok:true, winnerEmail: winner.email, totalEntrants: rows.length });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

