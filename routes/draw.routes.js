import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import Subscriber from '../models/subscriber.js';
import Draw from '../models/draw.js';

const router = Router();

function buildFilter(q){
  const f = {};
  if (q.confirmed === true || q.confirmed === false) f.confirmed = q.confirmed;
  if (q.minStars) f.stars = { $gte: Number(q.minStars)||0 };
  if (q.returning === true) f.is_returning = true;
  if (q.countryCode) f.country_code = String(q.countryCode).toUpperCase();
  if (q.startDate || q.endDate){
    const mode = (q.dateMode||'created');
    if (mode==='travel'){
      // travel_months is a free-text string. We approximate by testing if the string contains any month short name/year within range.
      // Build array of tokens like "Jan 2025", "Feb 2025"...
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const start = q.startDate ? new Date(q.startDate) : null;
      const end = q.endDate ? new Date(q.endDate) : null;
      const tokens = [];
      const iter = new Date(start||new Date('1970-01-01'));
      const last = new Date(end||new Date());
      last.setDate(1);
      iter.setDate(1);
      let guard = 0;
      while (iter <= last && guard < 240){ // up to 20 years guard
        tokens.push(`${months[iter.getMonth()]} ${iter.getFullYear()}`);
        iter.setMonth(iter.getMonth()+1);
        guard += 1;
      }
      if (tokens.length){
        f.travel_months = { $regex: `(${tokens.map(t=>t.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')).join('|')})`, $options: 'i' };
      }
    } else {
      f.created_at = {};
      if (q.startDate) f.created_at.$gte = new Date(q.startDate);
      if (q.endDate) { const d = new Date(q.endDate); d.setHours(23,59,59,999); f.created_at.$lte = d; }
    }
  }
  return f;
}

router.post('/simulate', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const filter = buildFilter(req.body||{});
    const eligible_count = await Subscriber.countDocuments(filter);
    const sample = await Subscriber.find(filter).sort({ created_at: -1 }).limit(10).select({ email:1, first_name:1, last_name:1, stars:1, confirmed:1, created_at:1 }).lean();
    return res.json({ ok:true, eligible_count, sample });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const criteria = req.body||{};
    const filter = buildFilter(criteria);
    const eligible = await Subscriber.find(filter).select({ email:1 }).lean();
    if (!eligible.length) return res.status(400).json({ ok:false, error:'No eligible subscribers' });
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const row = await Draw.create({ criteria, winner_email: winner.email, winner_id: String(winner._id), eligible_count: eligible.length, promotion_id: criteria.promotionId||null });
    return res.json({ ok:true, winnerEmail: winner.email, eligibleCount: eligible.length, drawId: String(row._id) });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.get('/history', adminLimiter, requireAdmin, async (_req, res) => {
  try{
    const rows = await Draw.find({}).sort({ created_at: -1 }).limit(10).lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.get('/export', adminLimiter, requireAdmin, async (req, res) => {
  try{
    const q = req.query||{};
    const filter = buildFilter({
      confirmed: q.confirmed==='1'?true:q.confirmed==='0'?false:undefined,
      minStars: q.minStars,
      returning: q.returning==='1'?true:undefined,
      countryCode: q.countryCode,
      startDate: q.startDate,
      endDate: q.endDate,
      dateMode: q.dateMode || 'created'
    });
    const rows = await Subscriber.find(filter).lean();
    const header = ['email','first_name','last_name','stars','confirmed','is_returning','discount_code','created_at'];
    const csv = [header.join(',')].concat(rows.map(r=>[
      r.email||'', r.first_name||'', r.last_name||'', r.stars||0, r.confirmed?1:0, r.is_returning?1:0, r.discount_code||'', r.created_at?.toISOString()||''
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="eligible.csv"');
    return res.send(csv);
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

