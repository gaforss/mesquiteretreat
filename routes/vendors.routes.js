import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Vendor from '../models/vendor.js';
import VendorClick from '../models/vendorClick.js';
import VendorOffering from '../models/vendorOffering.js';
import ServiceRequest from '../models/serviceRequest.js';
import { getCookieOpts, requireAdmin, signVendorToken, requireVendor } from '../middleware/auth.js';
import Subscriber from '../models/subscriber.js';
import { sendEmail } from '../services/email.service.js';

const router = Router();

// Vendor login/logout/me
router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok:false, error:'Missing credentials' });
    const v = await Vendor.findOne({ email: String(email).toLowerCase(), status: 'active' }).lean();
    if (!v) return res.status(401).json({ ok:false, error:'Invalid credentials' });
    const ok = await bcrypt.compare(password, v.password_hash || '');
    if (!ok) return res.status(401).json({ ok:false, error:'Invalid credentials' });
  const token = signVendorToken({ id: String(v._id), email: v.email, code: v.vendor_code, name: v.name||'' });
    res.cookie('vendor_jwt', token, { ...getCookieOpts(), maxAge: 48 * 60 * 60 * 1000 });
  return res.json({ ok:true, mustChangePassword: !!v.must_change_password });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/logout', requireVendor, async (_req, res) => {
  res.clearCookie('vendor_jwt', getCookieOpts());
  return res.json({ ok:true });
});

router.get('/me', requireVendor, async (req, res) => {
  try{
    const v = await Vendor.findById(req.vendor?.id).lean();
    if (!v) return res.status(404).json({ ok:false, error:'Vendor not found' });
    return res.json({ ok:true, vendor: { id: String(v._id), email: v.email, code: v.vendor_code, name: v.name||'', mustChangePassword: !!v.must_change_password } });
  }catch{ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Forgot password functionality
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });
    
    const vendor = await Vendor.findOne({ email: String(email).toLowerCase(), status: 'active' });
    if (!vendor) {
      // Don't reveal if email exists or not for security
      return res.json({ ok: true, message: 'If the email exists, a reset link has been sent.' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save reset token to vendor
    vendor.reset_token = resetToken;
    vendor.reset_token_expiry = resetTokenExpiry;
    await vendor.save();
    
    // Create reset URL
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/vendor-reset-password.html?token=${resetToken}`;
    
    // Send email
    const emailResult = await sendEmail({
      to: vendor.email,
      subject: 'Reset Your Password - Mesquite Retreat Vendor Portal',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hello ${vendor.name || 'there'},</p>
            <p>We received a request to reset your password for the Mesquite Retreat Vendor Portal.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
              Mesquite Retreat Vendor Portal<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `,
      tag: 'password-reset'
    });
    
    if (emailResult.success) {
      return res.json({ ok: true, message: 'Reset link sent successfully.' });
    } else {
      console.error('Failed to send password reset email:', emailResult.error);
      return res.status(500).json({ ok: false, error: 'Failed to send reset email. Please try again.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Token and new password are required' });
    }
    
    const vendor = await Vendor.findOne({
      reset_token: token,
      reset_token_expiry: { $gt: new Date() },
      status: 'active'
    });
    
    if (!vendor) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    vendor.password_hash = await bcrypt.hash(newPassword, 10);
    vendor.reset_token = undefined;
    vendor.reset_token_expiry = undefined;
    vendor.must_change_password = false;
    await vendor.save();
    
    return res.json({ ok: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Vendor self-service: change password
router.post('/change-password', requireVendor, async (req, res) => {
  try{
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ ok:false, error:'Missing new password' });
    const v = await Vendor.findById(req.vendor?.id);
    if (!v) return res.status(404).json({ ok:false, error:'Vendor not found' });
    if (currentPassword){
      const ok = await bcrypt.compare(currentPassword, v.password_hash||'');
      if (!ok) return res.status(401).json({ ok:false, error:'Current password incorrect' });
    }
    v.password_hash = await bcrypt.hash(newPassword, 10);
    v.must_change_password = false;
    await v.save();
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Vendor self-service: offerings CRUD
router.get('/offerings', requireVendor, async (req, res) => {
  try{
    const vendor = await Vendor.findById(req.vendor?.id).select({ vendor_code:1 }).lean();
    const rows = await VendorOffering.find({ vendor_code: vendor.vendor_code }).sort({ created_at: -1 }).lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/offerings', requireVendor, async (req, res) => {
  try{
    const vendor = await Vendor.findById(req.vendor?.id).select({ vendor_code:1 }).lean();
    const { title, description, url, price, discount_code, discount_percent, discount_text, image_url, logo_url, fulfillment_type, commission_percent, lead_price, service_fee, sponsored_rank, is_featured } = req.body || {};
    if (!title) return res.status(400).json({ ok:false, error:'Missing title' });
    const row = await VendorOffering.create({ vendor_id: String(req.vendor?.id), vendor_code: vendor.vendor_code, title, description: description||'', url: url||'', price: price?Number(price):null, active: true, property_only: true, discount_code: discount_code||'', discount_percent: discount_percent!=null?Number(discount_percent):null, discount_text: discount_text||'', image_url: image_url||'', logo_url: logo_url||'', fulfillment_type: fulfillment_type||'redirect', commission_percent: commission_percent!=null?Number(commission_percent):null, lead_price: lead_price!=null?Number(lead_price):null, service_fee: service_fee!=null?Number(service_fee):null, sponsored_rank: sponsored_rank!=null?Number(sponsored_rank):null, is_featured: !!is_featured });
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.put('/offerings/:id', requireVendor, async (req, res) => {
  try{
    const { id } = req.params; const updates = req.body || {};
    await VendorOffering.updateOne({ _id: id, vendor_id: req.vendor?.id }, { $set: updates });
    const row = await VendorOffering.findById(id).lean();
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.delete('/offerings/:id', requireVendor, async (req, res) => {
  try{
    const { id } = req.params;
    await VendorOffering.deleteOne({ _id: id, vendor_id: req.vendor?.id });
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Vendor stats (self)
router.get('/stats', requireVendor, async (req, res) => {
  try{
    const code = req.vendor?.code;
    const since = new Date(Date.now() - 7*24*60*60*1000);
    const total = await Subscriber.countDocuments({ vendor_code: code });
    const confirmed = await Subscriber.countDocuments({ vendor_code: code, confirmed: true });
    const week = await Subscriber.countDocuments({ vendor_code: code, created_at: { $gte: since } });
    const clicks = await VendorClick.countDocuments({ vendor_code: code });
    const offerings = await VendorOffering.find({ vendor_code: code }).sort({ created_at: -1 }).lean();
    return res.json({ ok:true, totals: { clicks, total, confirmed, last7d: week }, offerings });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: CRUD vendors
router.get('/', requireAdmin, async (_req, res) => {
  try{
    const rows = await Vendor.find({}).sort({ created_at: -1 }).lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: list vendors with basic aggregates
router.get('/with-stats', requireAdmin, async (_req, res) => {
  try{
    const vendors = await Vendor.find({}).sort({ created_at: -1 }).lean();
    const results = [];
    for (const v of vendors){
      const code = v.vendor_code;
      const clicks = await VendorClick.countDocuments({ vendor_code: code });
      const total = await Subscriber.countDocuments({ vendor_code: code });
      const confirmed = await Subscriber.countDocuments({ vendor_code: code, confirmed: true });
      results.push({ ...v, stats: { clicks, total, confirmed } });
    }
    return res.json({ ok:true, rows: results });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try{
    const { email, name, company, password, vendor_code } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Missing email' });
    const code = (vendor_code || (email.split('@')[0] + Math.random().toString(36).slice(2,6))).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
    const initialPassword = password || code; // default password to vendor code
    const hash = await bcrypt.hash(initialPassword, 10);
    const row = await Vendor.create({ email: String(email).toLowerCase(), name: name||'', company: company||'', password_hash: hash, vendor_code: code, status: 'active', must_change_password: true });
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.password){ updates.password_hash = await bcrypt.hash(updates.password, 10); delete updates.password; }
    await Vendor.updateOne({ _id: id }, { $set: updates });
    const row = await Vendor.findById(id).lean();
    return res.json({ ok:true, row });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    await Vendor.deleteOne({ _id: id });
    return res.json({ ok:true });
  }catch(err){ return res.status(500).json({ ok:false, error:'Server error' }); }
});

export default router;

// Public tracking (no auth)
export const vendorPublicRouter = Router();
vendorPublicRouter.get('/public/track', async (req, res) => {
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

// Public: list active vendor offerings for this property
vendorPublicRouter.get('/public/offerings', async (_req, res) => {
  try{
    const rows = await VendorOffering.find({ active: true, property_only: true })
      .sort({ created_at: -1 })
      .select({ vendor_code:1, title:1, description:1, url:1, price:1, discount_code:1, discount_percent:1, discount_text:1, image_url:1, logo_url:1 })
      .lean();
    return res.json({ ok:true, rows });
  }catch(err){ return res.status(500).json({ ok:false }); }
});

// Public: outbound redirect with tracking + referral params
vendorPublicRouter.get('/public/vendor-redirect', async (req, res) => {
  try{
    const vendor_code = String(req.query.vendor||'').toUpperCase();
    const url = String(req.query.url||'');
    if (!vendor_code || !url) return res.status(400).send('Missing params');
    // Track outbound click
    const headersIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = Array.isArray(headersIp) ? headersIp[0] : String(headersIp).split(',')[0];
    const user_agent = req.headers['user-agent'] || '';
    await VendorClick.create({ vendor_code, type: 'outbound', ip, user_agent });
    // Append UTM/referral parameters for vendor analytics
    let target;
    try{ target = new URL(url); }
    catch{ return res.status(400).send('Invalid URL'); }
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

