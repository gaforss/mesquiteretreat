import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';
import mongoose from 'mongoose';

const router = Router();

router.get('/admin-stats', adminLimiter, requireAdmin, async (_req, res) => {
  try{
    const totalsAgg = await Subscriber.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, confirmed: { $sum: { $cond: ['$confirmed', 1, 0] } }, totalStars: { $sum: '$stars' }, referred: { $sum: { $cond: [{ $gt: ['$referred_by', null] }, 1, 0] } } } }
    ]);
    const totals = totalsAgg[0] || { total:0, confirmed:0, totalStars:0, referred:0 };
    // Get subscriber growth over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const subscriberGrowth = await Subscriber.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo } } },
      { $group: { 
        _id: { 
          $dateToString: { format: '%Y-%m-%d', date: '$created_at' } 
        }, 
        count: { $sum: 1 } 
      }},
      { $sort: { _id: 1 } }
    ]);
    
    console.log('Subscriber growth data:', subscriberGrowth);
    
    return res.json({ ok:true, totals, subscriberGrowth });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.get('/signups-by-day', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await Subscriber.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $project: { d: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } } } },
      { $group: { _id: '$d', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

// Public stats for landing page: entries today (no admin required)
export const publicStatsRouter = Router();
publicStatsRouter.get('/public/entries-today', async (_req, res) => {
  try{
    const start = new Date(); start.setHours(0,0,0,0);
    const count = await Subscriber.countDocuments({ created_at: { $gte: start } });
    return res.json({ ok:true, count });
  }catch(err){ return res.status(500).json({ ok:false }); }
});

