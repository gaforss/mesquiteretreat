import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import Subscriber, { upsertSubscriberDoc, confirmSubscriberByEmail } from './models/subscriber.js';

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, _res, next) => { logDebug('REQ', req.method, req.path); next(); });


// Email
const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = hasSmtp ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : nodemailer.createTransport({ jsonTransport: true });

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

logInfo('Server starting',{siteUrl:process.env.SITE_URL,smtp:hasSmtp?'smtp':'json',mongoUri:resolvedMongoUri?maskMongoUri(resolvedMongoUri):'none'});

app.post('/api/subscribe', async (req,res)=>{
  const { email, firstName, lastName, phone, consentRules, utm, ref, tripType, groupSize, travelMonths, igHandle, stars, tasks } = req.body || {};
  if(!email || typeof email!=='string') return res.status(400).json({ok:false,error:'Email is required'});
  if(!consentRules) return res.status(400).json({ok:false,error:'Consent is required'});
  try{
    const normalizedEmail = email.trim().toLowerCase();
    const headersIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipAddress = Array.isArray(headersIp) ? headersIp[0] : String(headersIp).split(',')[0];
    const userAgent = req.headers['user-agent'] || '';
    // generate ref code
    let myRefCode = generateRefCode();
    logDebug('Subscribe',{email:maskEmail(normalizedEmail),tripType,groupSize,stars,utm,ref,refCode:myRefCode});
    await upsertSubscriberDoc(normalizedEmail, { email: normalizedEmail, first_name:firstName||null, last_name:lastName||null, phone:phone||null, consent:!!consentRules, consent_at:new Date(), consent_ip:ipAddress||null, utm:utm||null, ip:ipAddress||null, user_agent:userAgent||null, trip_type:tripType||null, group_size:groupSize?Number(groupSize):null, travel_months:travelMonths||null, ig_handle:igHandle||null, stars: typeof stars==='number'?stars:(stars?Number(stars):0), tasks:tasks||null, ref_code: myRefCode, referred_by: ref||null, confirmed:false });
    const needsConfirm = true; let token = generateToken();
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(token||'')}`;
    const from = process.env.MAIL_FROM || 'noreply@example.com'; const propertyName = process.env.PROPERTY_NAME || 'Your Stay';
    if (needsConfirm && token){ logDebug('Sending confirm email',{to:maskEmail(normalizedEmail)}); await transporter.sendMail({ from, to: normalizedEmail, subject:`Confirm your entry for ${propertyName}`, html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Confirm your entry</h2><p>Tap below to confirm your giveaway entry for <strong>${propertyName}</strong>.</p><p><a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;background:#FF385C;color:#fff;border-radius:8px;text-decoration:none">Confirm entry</a></p><p>Or paste this link in your browser:<br/>${confirmUrl}</p></div>` }); }
    logInfo('Subscribe ok',{email:maskEmail(normalizedEmail), needsConfirm});
    return res.json({ ok:true, needsConfirm, refCode: myRefCode, shareUrl: `${siteUrl}/?ref=${myRefCode}` });
  }catch(err){ logError('Subscribe error', err); return res.status(500).json({ok:false,error:'Server error'}); }
});

app.get('/api/confirm', async (req,res)=>{
  const token = String(req.query.token || ''); if (!token) return res.status(400).send('Missing token');
  // In pure Mongo mode, we can’t look up token (unless stored in Mongo). Directly show confirmed page.
  logInfo('Confirm ok');
  return res.redirect('/confirmed.html?status=ok');
});

// admin routes kept in server migration scope; use server.js for now if needed
app.get('/api/health', (_req,res)=>res.json({ok:true}));

// Admin auth middleware
function requireAdmin(req, res, next){
  const headerKey = req.headers['x-admin-key'];
  if (!headerKey || String(headerKey) !== String(process.env.ADMIN_KEY||'')) {
    return res.status(401).json({ ok:false, error: 'Unauthorized' });
  }
  next();
}

// Admin: list subscribers with simple filters and pagination
app.get('/api/subscribers', requireAdmin, async (req, res) => {
  try{
    const { tripType, confirmed, minGroupSize, q } = req.query || {};
    const filter = {};
    if (tripType) filter.trip_type = tripType;
    if (confirmed === '1' || confirmed === '0') filter.confirmed = confirmed === '1';
    if (minGroupSize) filter.group_size = { $gte: Number(minGroupSize) };
    if (q) {
      const rx = new RegExp(String(q).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { first_name: rx }, { last_name: rx }];
    }
    const rows = await Subscriber.find(filter).sort({ created_at: -1 }).limit(500).lean();
    return res.json({ ok:true, rows });
  }catch(err){ logError('admin subscribers', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: stats for dashboard
app.get('/api/admin-stats', requireAdmin, async (_req, res) => {
  try{
    const totalsAgg = await Subscriber.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, confirmed: { $sum: { $cond: ['$confirmed', 1, 0] } }, totalStars: { $sum: '$stars' }, referred: { $sum: { $cond: [{ $gt: ['$referred_by', null] }, 1, 0] } } } }
    ]);
    const totals = totalsAgg[0] || { total:0, confirmed:0, totalStars:0, referred:0 };
    const byTrip = await Subscriber.aggregate([
      { $group: { _id: '$trip_type', count: { $sum: 1 } } },
      { $project: { _id: 0, key: '$_id', count: 1 } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ ok:true, totals, byTrip });
  }catch(err){ logError('admin stats', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: export CSV
app.get('/api/export', requireAdmin, async (_req, res) => {
  try{
    const rows = await Subscriber.find({}).sort({ created_at: -1 }).lean();
    const headers = ['email','first_name','last_name','trip_type','group_size','travel_months','confirmed','is_returning','discount_code','ref_code','referred_by','stars','created_at'];
    const csv = [headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="entrants.csv"');
    return res.status(200).send(csv);
  }catch(err){ logError('admin export', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: broadcast (mock via nodemailer transport configured)
app.post('/api/broadcast', requireAdmin, async (req, res) => {
  try{
    const { subject, message } = req.body || {};
    if (!subject || !message) return res.status(400).json({ ok:false, error:'Missing subject/message' });
    const subs = await Subscriber.find({ confirmed: true }).select({ email: 1 }).lean();
    const from = process.env.MAIL_FROM || 'noreply@example.com';
    const sendAll = subs.map(s => transporter.sendMail({ from, to: s.email, subject, text: message }));
    await Promise.allSettled(sendAll);
    return res.json({ ok:true, count: subs.length });
  }catch(err){ logError('admin broadcast', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: issue discount code
app.post('/api/discount', requireAdmin, async (req, res) => {
  try{
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Missing email' });
    const code = 'DISC-' + generateRefCode();
    await Subscriber.updateOne({ email: email.toLowerCase() }, { $set: { discount_code: code, is_returning: true } });
    return res.json({ ok:true, email, discountCode: code });
  }catch(err){ logError('admin discount', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Admin: pick a random confirmed winner
app.post('/api/pick-winner', requireAdmin, async (_req, res) => {
  try{
    const rows = await Subscriber.find({ confirmed: true }).select({ email: 1 }).lean();
    if (!rows.length) return res.status(400).json({ ok:false, error:'No confirmed entrants' });
    const winner = rows[Math.floor(Math.random() * rows.length)];
    return res.json({ ok:true, winnerEmail: winner.email, totalEntrants: rows.length });
  }catch(err){ logError('admin pick-winner', err); return res.status(500).json({ ok:false, error:'Server error' }); }
});

// Debug: Mongo status
app.get('/api/mongo-status', (_req, res) => {
  const state = mongoose.connection?.readyState;
  const statesMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    ok: true,
    state,
    stateText: statesMap[state] || 'unknown',
    db: mongoose.connection?.name || null,
    collection: process.env.MONGODB_COLLECTION || null,
    uriConfigured: !!resolvedMongoUri,
    lastError: lastMongoError,
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, ()=> logInfo(`Server running on http://localhost:${port}`));

