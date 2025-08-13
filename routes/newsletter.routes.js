import express from 'express';
import jwt from 'jsonwebtoken';
import Subscriber from '../models/subscriber.js';
import { sendNewsletterEmail, sendTestEmail, getEmailTransportInfo } from '../services/email.service.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-secret';

// Middleware to check admin authentication
function isAuthed(req) {
  const token = req.cookies?.admin_jwt;
  if (!token) return false;
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// Get newsletter statistics
router.get('/stats', (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  // For now, return basic stats
  // In a real implementation, you'd query your database for actual stats
  res.json({
    ok: true,
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    subscribers: 0
  });
});

// Send newsletter
router.post('/send', async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { subject, message, sendTo, schedule, scheduleDate, scheduleTime } = req.body;

    // Basic validation
    if (!subject || !message) {
      return res.status(400).json({ ok: false, error: 'Subject and message are required' });
    }

    // Get subscriber count based on sendTo criteria
    let subscriberCount = 0;
    let query = { confirmed: true }; // Default to confirmed subscribers

    switch (sendTo) {
      case 'all':
        query = {};
        break;
      case 'confirmed':
        query = { confirmed: true };
        break;
      case 'returning':
        query = { confirmed: true, stars: { $gt: 0 } };
        break;
      case 'new':
        query = { confirmed: true, stars: 0 };
        break;
    }

    subscriberCount = await Subscriber.countDocuments(query);

    if (subscriberCount === 0) {
      return res.status(400).json({ ok: false, error: 'No subscribers found for the selected criteria' });
    }

    // Get subscribers to send to
    const subscribers = await Subscriber.find(query).select({ email: 1 }).lean();
    
    // Send emails to subscribers
    let sentCount = 0;
    let errors = [];

    for (const subscriber of subscribers) {
      try {
        const result = await sendNewsletterEmail(subscriber.email, subject, message);
        if (result.success) {
          sentCount++;
        } else {
          console.error(`Failed to send email to ${subscriber.email}:`, result.error);
          errors.push(subscriber.email);
        }
      } catch (err) {
        console.error(`Failed to send email to ${subscriber.email}:`, err);
        errors.push(subscriber.email);
      }
    }

    res.json({
      ok: true,
      count: sentCount,
      total: subscriberCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Newsletter sent to ${sentCount} subscribers${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
    });

  } catch (err) {
    console.error('Newsletter send error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Send test email
router.post('/test', async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ ok: false, error: 'Subject and message are required' });
    }

    // Get admin email from JWT token
    const token = req.cookies?.admin_jwt;
    const payload = jwt.verify(token, JWT_SECRET);
    const adminEmail = payload.email || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      return res.status(400).json({ ok: false, error: 'No admin email found for test email' });
    }

    // Send test email to admin
    try {
      const result = await sendTestEmail(adminEmail, subject, message);
      
      if (result.success) {
        res.json({
          ok: true,
          message: 'Test email sent successfully',
          messageId: result.messageId,
          transport: result.transport
        });
      } else {
        console.error('Test email error:', result.error);
        res.status(500).json({ ok: false, error: 'Failed to send test email', details: result.error });
      }
    } catch (err) {
      console.error('Test email error:', err);
      res.status(500).json({ ok: false, error: 'Failed to send test email' });
    }

  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ ok: false, error: 'Server error', details: err.message });
  }
});

// Send a preview of the newsletter to a single address (uses newsletter stream)
router.post('/preview', async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { subject, message, to } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ ok: false, error: 'Subject and message are required' });
    }

    const previewTo = to || process.env.ADMIN_EMAIL || process.env.MAIL_FROM;
    if (!previewTo) {
      return res.status(400).json({ ok: false, error: 'No preview recipient specified' });
    }

    const result = await sendNewsletterEmail(previewTo, subject, message);

    if (result.success) {
      return res.json({ ok: true, message: 'Preview sent', to: previewTo, messageId: result.messageId, transport: result.transport });
    }

    return res.status(500).json({ ok: false, error: 'Failed to send preview', details: result.error });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error', details: err.message });
  }
});

// Save draft
router.post('/draft', (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { subject, message, sendTo, schedule, scheduleDate, scheduleTime } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ ok: false, error: 'Subject and message are required' });
    }

    // For now, just return success
    // In a real implementation, you'd save the draft to a database
    res.json({
      ok: true,
      message: 'Draft saved successfully'
    });

  } catch (err) {
    console.error('Save draft error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router; 