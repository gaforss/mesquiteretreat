import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';
import { sendDiscountCodeEmail, sendWinnerNotificationEmail } from '../services/email.service.js';

const router = Router();

router.post('/broadcast', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { subject, message } = req.body || {};
    if (!subject || !message) return res.status(400).json({ ok:false, error:'Missing subject or message' });
    const count = await Subscriber.countDocuments({});
    // NOTE: For simplicity, this endpoint does not send emails. Integrate your mailer here if desired.
    return res.json({ ok:true, count });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/discount', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Missing email' });
    const code = 'DISC-' + Math.random().toString(36).slice(2,8).toUpperCase();
    await Subscriber.updateOne({ email: email.toLowerCase() }, { $set: { discount_code: code, is_returning: true } });
    
    // Send discount code email
    const result = await sendDiscountCodeEmail(email.toLowerCase(), code);
    if (!result.success) {
      console.error('Failed to send discount code email:', result.error);
    }
    
    return res.json({ ok:true, email, discountCode: code, emailSent: result.success });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/pick-winner', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { promotionName = 'Giveaway' } = req.body || {};
    const rows = await Subscriber.find({ confirmed: true }).select({ email: 1 }).lean();
    if (!rows.length) return res.status(400).json({ ok:false, error:'No confirmed entrants' });
    const winner = rows[Math.floor(Math.random() * rows.length)];
    
    // Send winner notification email
    const result = await sendWinnerNotificationEmail(winner.email, promotionName);
    if (!result.success) {
      console.error('Failed to send winner notification email:', result.error);
    }
    
    return res.json({ 
      ok: true, 
      winnerEmail: winner.email, 
      totalEntrants: rows.length, 
      emailSent: result.success 
    });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

