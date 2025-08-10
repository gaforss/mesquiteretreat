import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Subscriber, { upsertSubscriberDoc, confirmSubscriberByEmail } from './models/subscriber.js';
import Promotion from './models/promotion.js';
import { sendConfirmationEmail, sendTestEmail, getEmailTransportInfo } from './services/email.service.js';
import authRouter from './routes/auth.routes.js';
import subscribersRouter from './routes/subscribers.routes.js';
import exportRouter from './routes/export.routes.js';
import adminActionsRouter from './routes/admin.actions.routes.js';
import promotionsRouter from './routes/promotions.routes.js';
import statsRouter, { publicStatsRouter } from './routes/stats.routes.js';
import siteContentRouter from './routes/siteContent.routes.js';
import drawRouter from './routes/draw.routes.js';
import healthRouter from './routes/health.routes.js';
import newsletterRouter from './routes/newsletter.routes.js';
import { subscribeLimiter } from './middleware/rateLimiters.js';
import vendorsRouter from './routes/vendors.routes.js';
import vendorPublicRouter from './routes/vendors.public.routes.js';
import instagramRouter from './routes/instagram.routes.js';
import Vendor from './models/vendor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEBUG = (process.env.DEBUG || '').toLowerCase() === 'true';
function logDebug(...args) { if (DEBUG) console.log('[DEBUG]', ...args); }
function logInfo(...args) { console.log('[INFO]', ...args); }
function logWarn(...args) { console.warn('[WARN]', ...args); }
function logError(...args) { console.error('[ERROR]', ...args); }
function maskEmail(email) { const [u,d] = String(email||'').split('@'); return `${u?.slice(0,2)}***@${d||''}`; }
function maskMongoUri(uri) { try { const m=String(uri||''); const at=m.indexOf('@'); return at>-1?'***'+m.slice(at):m.slice(0,24)+'…'; } catch { return '***'; } }

const allowedOrigin = process.env.SITE_URL || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, _res, next) => { logDebug('REQ', req.method, req.path); next(); });
// Auth pages and protection for admin HTML must be before static middleware
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'change-me';
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
const isHttps = /^https:\/\//i.test(siteUrl);
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: isHttps, path: '/' };

function signAdminToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' }); }
function verifyAdminToken(token){ return jwt.verify(token, JWT_SECRET); }

// Sign a short-lived confirmation token that encodes the subscriber's email
function signConfirmToken(email){ return jwt.sign({ email }, JWT_SECRET, { expiresIn: '3d' }); }

app.get(['/login','/login.html'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// Vendor public pages
app.get(['/vendor-login','/vendor-login.html'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendor-login.html'));
});

function isVendorAuthed(req){
  const token = req.cookies?.vendor_jwt; if (!token) return false;
  try { jwt.verify(token, JWT_SECRET); return true; } catch { return false; }
}

app.get(['/vendor','/vendor.html'], (req, res) => {
  if (!isVendorAuthed(req)) return res.redirect('/vendor-login.html');
  return res.sendFile(path.join(__dirname, 'public', 'vendor.html'));
});

function isAuthed(req){
  const token = req.cookies?.admin_jwt;
  if (!token) return false;
  try { verifyAdminToken(token); return true; } catch { return false; }
}

app.get(['/admin','/admin.html'], (req, res) => {
  if (!isAuthed(req)) return res.redirect('/login.html');
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get(['/admin-content','/admin-content.html'], (req, res) => {
  if (!isAuthed(req)) return res.redirect('/login.html');
  return res.sendFile(path.join(__dirname, 'public', 'admin-content.html'));
});

app.get(['/admin-vendors','/admin-vendors.html'], (req, res) => {
  if (!isAuthed(req)) return res.redirect('/login.html');
  return res.sendFile(path.join(__dirname, 'public', 'admin-vendors.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Email service is now centralized in services/email.service.js

// Mongo (Mongoose)
const resolvedMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
let lastMongoError = null;
async function initMongo(){
  if(!resolvedMongoUri) return;
  try{
    const hasDbInUri = /mongodb(?:\+srv)?:\/\/[^/]+\/.+/.test(resolvedMongoUri);
    const dbNameOpt = hasDbInUri ? undefined : (process.env.MONGODB_DB || undefined);
    await mongoose.connect(resolvedMongoUri, { serverSelectionTimeoutMS: 6000, dbName: dbNameOpt });
    logInfo('Mongo connected via Mongoose', { db: mongoose.connection?.name, collection: process.env.MONGODB_COLLECTION });
    lastMongoError = null;
  }catch(e){
    lastMongoError = { message: e?.message, code: e?.code, codeName: e?.codeName, errmsg: e?.errmsg };
    logError('Mongo init failed', lastMongoError);
  }
}
initMongo();

mongoose.connection.on('error', (e)=>{
  lastMongoError = { message: e?.message, code: e?.code, codeName: e?.codeName, errmsg: e?.errmsg };
  logError('Mongo connection error', lastMongoError);
});
mongoose.connection.on('connected', ()=>{
  logInfo('Mongo connection event: connected', { db: mongoose.connection?.name });
});

function generateRefCode(){ const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code=''; for(let i=0;i<8;i+=1){ code+=alphabet[Math.floor(Math.random()*alphabet.length)]; } return code; }
function generateToken(){ return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64url').replace(/\./g,''); }

logInfo('Server starting',{siteUrl:process.env.SITE_URL,email:getEmailTransportInfo().transport,mongoUri:resolvedMongoUri?maskMongoUri(resolvedMongoUri):'none'});

app.post('/api/subscribe', subscribeLimiter, async (req,res)=>{
  const { email, firstName, lastName, phone, consentRules, newsletter, utm, ref, tripType, groupSize, igHandle, stars, tasks, vendor: vendorCodeRaw } = req.body || {};
  if(!email || typeof email!=='string') return res.status(400).json({ok:false,error:'Email is required'});
  if(!consentRules) return res.status(400).json({ok:false,error:'Consent is required'});
  if(!newsletter) return res.status(400).json({ok:false,error:'Newsletter subscription is required'});
  try{
    const normalizedEmail = email.trim().toLowerCase();
    // Check prior state to make referral credit idempotent
    const existing = await Subscriber.findOne({ email: normalizedEmail }).select({ referred_by: 1, stars: 1 }).lean();
    const headersIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipAddress = Array.isArray(headersIp) ? headersIp[0] : String(headersIp).split(',')[0];
    // crude geo from Cloudflare headers or placeholders
    const cfCountry = req.headers['cf-ipcountry'] || null;
    const cfCity = req.headers['cf-ipcity'] || null;
    const cfRegion = req.headers['cf-region'] || null;
    const userAgent = req.headers['user-agent'] || '';
    // generate ref code
    let myRefCode = generateRefCode();
    logDebug('Subscribe',{email:maskEmail(normalizedEmail),tripType,groupSize,stars,utm,ref,refCode:myRefCode});
    // Preserve existing referred_by if already set to avoid re-crediting
    const referredByToSet = existing?.referred_by ? existing.referred_by : (ref || null);
    // Resolve vendor code if provided
    let vendor_code = null; let vendor_id = null; let source_type = null;
    if (vendorCodeRaw){
      const v = await Vendor.findOne({ vendor_code: String(vendorCodeRaw).toUpperCase(), status: 'active' }).select({ _id:1, vendor_code:1 }).lean();
      if (v){ vendor_code = v.vendor_code; vendor_id = String(v._id); source_type = 'vendor'; }
    }
    
    // Calculate bonus stars
    let bonusStars = typeof stars==='number'?stars:(stars?Number(stars):0);
    
    // Add Instagram referral bonus if user came from Instagram and hasn't been credited yet
    const isFromInstagram = utm?.source === 'ig' || utm?.source === 'instagram' || utm?.medium === 'social' || utm?.campaign?.includes('instagram');
    const hasInstagramBonus = existing?.stars && existing.stars > 0; // Simple check - could be more sophisticated
    if (isFromInstagram && !hasInstagramBonus && !existing?.referred_by) {
      bonusStars += 1;
      logDebug('Instagram bonus awarded', { email: maskEmail(normalizedEmail), utm });
    }
    
    await upsertSubscriberDoc(normalizedEmail, { email: normalizedEmail, first_name:firstName||null, last_name:lastName||null, phone:phone||null, consent:!!consentRules, consent_at:new Date(), consent_ip:ipAddress||null, utm:utm||null, ip:ipAddress||null, user_agent:userAgent||null, trip_type:tripType||null, group_size:groupSize?Number(groupSize):null, ig_handle:igHandle||null, stars: bonusStars, tasks:tasks||null, ref_code: myRefCode, referred_by: referredByToSet, vendor_code, vendor_id, source_type, confirmed:false, country_code: cfCountry||null, city: cfCity||null, region: cfRegion||null });

    // If a ref code was provided and this is the first time setting referred_by, credit the referrer with +1 star
    if (ref && !existing?.referred_by) {
      const referrer = await Subscriber.findOne({ ref_code: ref }).select({ email: 1 }).lean();
      if (referrer && String(referrer.email).toLowerCase() !== normalizedEmail) {
        await Subscriber.updateOne({ ref_code: ref }, { $inc: { stars: 1 } });
      }
    }
    const needsConfirm = true; let token = signConfirmToken(normalizedEmail);
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(token||'')}`;
    const from = process.env.MAIL_FROM || 'noreply@example.com'; const propertyName = process.env.PROPERTY_NAME || 'Your Stay';
    if (needsConfirm && token){ 
      logDebug('Sending confirm email',{to:maskEmail(normalizedEmail)}); 
      const result = await sendConfirmationEmail(normalizedEmail, confirmUrl, propertyName);
      if (!result.success) {
        logError('Failed to send confirmation email', result.error);
      }
    }
    logInfo('Subscribe ok',{email:maskEmail(normalizedEmail), needsConfirm});
    return res.json({ ok:true, needsConfirm, refCode: myRefCode, shareUrl: `${siteUrl}/?ref=${myRefCode}` });
  }catch(err){ logError('Subscribe error', err); return res.status(500).json({ok:false,error:'Server error'}); }
});

app.get('/api/confirm', async (req,res)=>{
  const token = String(req.query.token || ''); if (!token) return res.status(400).send('Missing token');
  try{
    const payload = verifyAdminToken(token);
    const email = String(payload?.email||'').toLowerCase();
    if (!email) { logWarn('Confirm missing email in token'); return res.redirect('/confirmed.html?status=invalid'); }
    await confirmSubscriberByEmail(email);
    logInfo('Confirm ok',{ email: maskEmail(email) });
    return res.redirect('/confirmed.html?status=ok');
  }catch(err){
    logWarn('Confirm invalid token');
    return res.redirect('/confirmed.html?status=invalid');
  }
});

// Test email endpoint (no auth required for testing)
app.post('/api/test-email', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({ ok: false, error: 'to, subject, and message are required' });
    }
    
    const from = process.env.MAIL_FROM || 'noreply@mesquiteretreat.com';
    
    logInfo('Sending test email', { to: maskEmail(to), subject, from });
    
    const result = await sendTestEmail(to, subject, message);
    
    if (result.success) {
      logInfo('Test email sent successfully', { to: maskEmail(to), messageId: result.messageId });
      res.json({ 
        ok: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId,
        transport: result.transport
      });
    } else {
      logError('Test email failed', result.error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to send test email', 
        details: result.error 
      });
    }
    
  } catch (err) {
    logError('Test email error', err);
    res.status(500).json({ ok: false, error: 'Failed to send test email', details: err.message });
  }
});

// Mount routers
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/export', exportRouter);
app.use('/api', adminActionsRouter); // /discount, /pick-winner
app.use('/api/promotions', promotionsRouter);
app.use('/api', statsRouter); // /admin-stats, /signups-by-day
app.use('/api', publicStatsRouter); // /public/entries-today
app.use('/api', vendorPublicRouter); // /public/track
app.use('/api/draw', drawRouter);
app.use('/api', siteContentRouter); // /site-content
app.use('/api/newsletter', newsletterRouter); // /newsletter/*
app.use('/api/instagram', instagramRouter); // /instagram/*


const port = Number(process.env.PORT || 3000);
app.listen(port, ()=> logInfo(`Server running on http://localhost:${port}`));

