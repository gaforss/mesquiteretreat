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

// Update a single subscriber
router.put('/:id', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    const allowed = ['first_name','last_name','trip_type','group_size','travel_months','stars','confirmed','is_returning','discount_code'];
    const updates = {};
    for (const k of allowed){ if (k in (req.body||{})) updates[k] = req.body[k]; }
    if ('group_size' in updates) updates.group_size = Number(updates.group_size) || null;
    if ('stars' in updates) updates.stars = Number(updates.stars) || 0;
    if ('confirmed' in updates) updates.confirmed = !!updates.confirmed;
    if ('is_returning' in updates) updates.is_returning = !!updates.is_returning;
    await Subscriber.updateOne({ _id: id }, { $set: updates });
    const row = await Subscriber.findById(id).lean();
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Delete a single subscriber
router.delete('/:id', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    await Subscriber.deleteOne({ _id: id });
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Bulk delete
router.post('/bulk-delete', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ ok:false, error:'No ids' });
    const r = await Subscriber.deleteMany({ _id: { $in: ids } });
    return res.json({ ok:true, deleted: r?.deletedCount||0 });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Bulk update limited fields
router.post('/bulk-update', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ ok:false, error:'No ids' });
    const allowed = ['confirmed','is_returning','discount_code','stars'];
    const updates = {};
    for (const k of allowed){ if (k in (req.body||{})) updates[k] = req.body[k]; }
    if ('stars' in updates) updates.stars = Number(updates.stars) || 0;
    if ('confirmed' in updates) updates.confirmed = !!updates.confirmed;
    if ('is_returning' in updates) updates.is_returning = !!updates.is_returning;
    if (!Object.keys(updates).length) return res.status(400).json({ ok:false, error:'No updates provided' });
    const r = await Subscriber.updateMany({ _id: { $in: ids } }, { $set: updates });
    return res.json({ ok:true, modified: r?.modifiedCount||0 });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

