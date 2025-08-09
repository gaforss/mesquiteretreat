import { Router } from 'express';
import VendorClick from '../models/vendorClick.js';
import VendorOffering from '../models/vendorOffering.js';
import ServiceRequest from '../models/serviceRequest.js';

const publicRouter = Router();

publicRouter.get('/public/track', async (req, res) => {
  try{
    const vendor_code = String(req.query.vendor||'').toUpperCase();
    const type = String(req.query.type||'landing');
    if (!vendor_code) return res.json({ ok:true });
    const headersIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = Array.isArray(headersIp) ? headersIp[0] : String(headersIp).split(',')[0];
    const user_agent = req.headers['user-agent'] || '';
    await VendorClick.create({ vendor_code, type, ip, user_agent });
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false }); }
});

publicRouter.get('/public/offerings', async (_req, res) => {
  try{
    const rows = await VendorOffering.find({ active: true, property_only: true })
      .sort({ created_at: -1 })
      .select({ vendor_code:1, title:1, description:1, url:1, price:1, discount_code:1, discount_percent:1, discount_text:1, image_url:1, logo_url:1, fulfillment_type:1 })
      .lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false }); }
});

publicRouter.get('/public/vendor-redirect', async (req, res) => {
  try{
    const vendor_code = String(req.query.vendor||'').toUpperCase();
    const url = String(req.query.url||'');
    if (!vendor_code || !url) return res.status(400).send('Missing params');
    const headersIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = Array.isArray(headersIp) ? headersIp[0] : String(headersIp).split(',')[0];
    const user_agent = req.headers['user-agent'] || '';
    await VendorClick.create({ vendor_code, type: 'outbound', ip, user_agent });
    let target;
    try{ target = new URL(url); } catch { return res.status(400).send('Invalid URL'); }
    const params = {
      utm_source: 'mesquite_retreat',
      utm_medium: 'vendor_network',
      utm_campaign: 'mesquite_vendor_network',
      utm_content: vendor_code,
      mesquite_ref: vendor_code,
    };
    Object.entries(params).forEach(([k,v])=>{ target.searchParams.set(k, v); });
    return res.redirect(302, target.toString());
  }catch(err){ return res.status(500).send('Server error'); }
});

publicRouter.post('/public/request', async (req, res) => {
  try{
    const { offeringId, guest_name, guest_email, guest_phone, dates, notes } = req.body || {};
    if (!offeringId || !guest_email) return res.status(400).json({ ok:false, error:'Missing fields' });
    const off = await VendorOffering.findById(offeringId).lean();
    if (!off || !off.active) return res.status(404).json({ ok:false, error:'Offering not found' });
    const row = await ServiceRequest.create({ offering_id: String(off._id), vendor_code: off.vendor_code, title: off.title||'', guest_name: guest_name||'', guest_email: guest_email||'', guest_phone: guest_phone||'', dates: dates||'', notes: notes||'', source: 'network', status: 'new' });
    return res.json({ ok:true, id: String(row._id) });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default publicRouter;

