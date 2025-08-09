import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';

const router = Router();

router.get('/', adminLimiter, requireAdmin, async (_req, res) => {
  try{
    const rows = await Subscriber.find({}).sort({ created_at: -1 }).lean();
    const headers = ['email','first_name','last_name','trip_type','group_size','travel_months','confirmed','is_returning','discount_code','ref_code','referred_by','stars','created_at'];
    const csv = [headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="entrants.csv"');
    return res.status(200).send(csv);
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

