import postmark from 'postmark';
import nodemailer from 'nodemailer';

// Email configuration
const hasPostmark = !!process.env.POSTMARK_API_TOKEN;
const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;

// Initialize email transporter
async function initTransporter() {
  if (hasPostmark) {
    transporter = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);
  } else if (hasSmtp) {
    transporter = nodemailer.createTransport({ 
      host: process.env.SMTP_HOST, 
      port: Number(process.env.SMTP_PORT || 587), 
      secure: false, 
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } 
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
}

// Send email function that works with both Postmark and nodemailer
async function sendEmail(options) {
  const {
    to,
    from = process.env.MAIL_FROM || 'noreply@mesquiteretreat.com',
    subject,
    html,
    text,
    tag,
    replyTo,
    attachments
  } = options;

  if (!transporter) {
    await initTransporter();
  }

  try {
    if (hasPostmark) {
      const postmarkOptions = {
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        Tag: tag || 'general'
      };

      if (replyTo) postmarkOptions.ReplyTo = replyTo;
      if (attachments) postmarkOptions.Attachments = attachments;

      const result = await transporter.sendEmail(postmarkOptions);
      return {
        success: true,
        messageId: result.MessageID,
        transport: 'postmark'
      };
    } else {
      const nodemailerOptions = {
        from,
        to,
        subject,
        html,
        text,
        replyTo,
        attachments
      };

      const result = await transporter.sendMail(nodemailerOptions);
      return {
        success: true,
        messageId: result.messageId,
        transport: hasSmtp ? 'smtp' : 'json'
      };
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error.message,
      transport: hasPostmark ? 'postmark' : (hasSmtp ? 'smtp' : 'json')
    };
  }
}

// Specific email functions
async function sendConfirmationEmail(email, confirmUrl, propertyName) {
  return sendEmail({
    to: email,
    subject: `Confirm your entry for ${propertyName}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Confirm your entry</h2>
      <p>Tap below to confirm your giveaway entry for <strong>${propertyName}</strong>.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:10px 14px;background:#FF385C;color:#fff;border-radius:8px;text-decoration:none">Confirm entry</a></p>
      <p>Or paste this link in your browser:<br/>${confirmUrl}</p>
    </div>`,
    tag: 'confirmation'
  });
}

async function sendNewsletterEmail(email, subject, message) {
  return sendEmail({
    to: email,
    subject,
    html: message,
    tag: 'newsletter'
  });
}

async function sendTestEmail(to, subject, message) {
  return sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>[TEST] ${subject}</h2>
      <p>${message}</p>
      <hr>
      <p style="font-size:12px;color:#666;">
        This is a test email from the Mesquite Retreat newsletter system.<br>
        Sent at: ${new Date().toLocaleString()}
      </p>
    </div>`,
    tag: 'test'
  });
}

async function sendDiscountCodeEmail(email, discountCode) {
  return sendEmail({
    to: email,
    subject: 'Your Discount Code - The Mesquite Retreat',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>🎉 Your Discount Code!</h2>
      <p>Thank you for being a valued guest at The Mesquite Retreat!</p>
      <p>Here's your exclusive discount code:</p>
      <div style="background:#f8f9fa;border:2px solid #FF385C;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
        <h3 style="color:#FF385C;margin:0;font-size:24px;">${discountCode}</h3>
      </div>
      <p>Use this code when booking your next stay for special pricing.</p>
      <p>We look forward to welcoming you back!</p>
    </div>`,
    tag: 'discount'
  });
}

async function sendWinnerNotificationEmail(email, promotionName) {
  return sendEmail({
    to: email,
    subject: `🎉 Congratulations! You're a Winner!`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>🎉 Congratulations!</h2>
      <p>You've won in our <strong>${promotionName}</strong> promotion!</p>
      <p>We'll be in touch soon with details about your prize.</p>
      <p>Thank you for being part of The Mesquite Retreat community!</p>
    </div>`,
    tag: 'winner'
  });
}

// Get current email transport info
function getEmailTransportInfo() {
  return {
    hasPostmark,
    hasSmtp,
    transport: hasPostmark ? 'postmark' : (hasSmtp ? 'smtp' : 'json'),
    configured: hasPostmark || hasSmtp
  };
}

export {
  initTransporter,
  sendEmail,
  sendConfirmationEmail,
  sendNewsletterEmail,
  sendTestEmail,
  sendDiscountCodeEmail,
  sendWinnerNotificationEmail,
  getEmailTransportInfo
}; 