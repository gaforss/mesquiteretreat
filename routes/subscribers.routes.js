import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';

const router = Router();

router.get('/', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { tripType, confirmed, minGroupSize, q, page = '1', pageSize = '25', sort = 'created_at', dir = 'desc' } = req.query || {};
    const filter = {};
    if (tripType) filter.trip_type = tripType;
    if (confirmed === '1' || confirmed === '0') filter.confirmed = confirmed === '1';
    if (minGroupSize) filter.group_size = { $gte: Number(minGroupSize) };
    if (q) {
      const rx = new RegExp(String(q).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { first_name: rx }, { last_name: rx }];
    }
    const pg = Math.max(1, Number(page));
    const ps = Math.min(200, Math.max(1, Number(pageSize)));
    const sortField = ['created_at','email','stars','group_size','confirmed'].includes(String(sort)) ? String(sort) : 'created_at';
    const sortDir = String(dir).toLowerCase() === 'asc' ? 1 : -1;
    const total = await Subscriber.countDocuments(filter);
    const rows = await Subscriber.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((pg - 1) * ps)
      .limit(ps)
      .lean();
    return res.json({ ok:true, rows, page: pg, pageSize: ps, total, totalPages: Math.ceil(total/ps) });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

