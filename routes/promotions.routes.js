import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Promotion from '../models/promotion.js';

const router = Router();

router.get('/', adminLimiter, requireAdmin, async (_req, res) => {
  try{
    const rows = await Promotion.find({}).sort({ created_at: -1 }).lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { title, code, start_date, end_date, draw_date, notes, active } = req.body || {};
    if (!title) return res.status(400).json({ ok:false, error:'Missing title' });
    const row = await Promotion.create({ title, code, start_date, end_date, draw_date, notes, active: !!active });
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.put('/:id', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { id } = req.params; const updates = req.body || {};
    await Promotion.updateOne({ _id: id }, { $set: updates });
    const row = await Promotion.findById(id).lean();
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.delete('/:id', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const { id } = req.params; await Promotion.deleteOne({ _id: id });
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

