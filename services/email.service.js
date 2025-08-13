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

      // Choose appropriate Postmark Message Stream
      const globalStream = process.env.POSTMARK_MESSAGE_STREAM;
      const txStream = process.env.POSTMARK_TRANSACTIONAL_STREAM;
      const newsletterStream = process.env.POSTMARK_NEWSLETTER_STREAM;
      const isNewsletter = (tag || '').toLowerCase() === 'newsletter';
      const chosenStream = isNewsletter ? (newsletterStream || globalStream) : (txStream || globalStream);
      if (chosenStream) postmarkOptions.MessageStream = chosenStream;

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

// Invoice-related email functions
async function sendInvoiceEmail(email, invoiceData) {
  const { invoice_number, total_amount, items, expires_at, payment_url } = invoiceData;
  const expiryDate = new Date(expires_at).toLocaleDateString();
  
  return sendEmail({
    to: email,
    subject: `Invoice #${invoice_number} - The Mesquite Retreat`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Invoice #${invoice_number}</h2>
      <p>Thank you for your order at The Mesquite Retreat!</p>
      
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
        <h3>Order Summary</h3>
        ${items.map(item => `
          <div style="margin:10px 0;padding:10px;border-bottom:1px solid #eee;">
            <strong>${item.name}</strong><br>
            <small>${item.description || ''}</small><br>
            Qty: ${item.quantity} × $${item.unit_price} = $${item.total_price}
          </div>
        `).join('')}
        <div style="margin-top:20px;padding-top:10px;border-top:2px solid #FF385C;">
          <strong>Total: $${total_amount}</strong>
        </div>
      </div>
      
      <p><strong>Payment Due:</strong> ${expiryDate}</p>
      
      <p><a href="${payment_url}" style="display:inline-block;padding:12px 20px;background:#FF385C;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Pay Now</a></p>
      
      <p>This invoice will expire on ${expiryDate}. Please complete payment to secure your items.</p>
    </div>`,
    tag: 'invoice'
  });
}

async function sendPaymentConfirmationEmail(email, invoiceData) {
  const { invoice_number, total_amount, items, lockbox_code, access_instructions, access_expires_at } = invoiceData;
  const expiryDate = new Date(access_expires_at).toLocaleDateString();
  
  return sendEmail({
    to: email,
    subject: `Payment Confirmed - Access Code for ${invoice_number}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>🎉 Payment Confirmed!</h2>
      <p>Thank you for your payment of $${total_amount} for invoice #${invoice_number}.</p>
      
      <div style="background:#f8f9fa;border:2px solid #28a745;border-radius:8px;padding:20px;margin:20px 0;">
        <h3>🔐 Your Access Code</h3>
        <div style="text-align:center;margin:20px 0;">
          <div style="font-size:32px;font-weight:bold;color:#28a745;letter-spacing:4px;">${lockbox_code}</div>
        </div>
        <p><strong>Access Instructions:</strong></p>
        <p>${access_instructions || 'Enter this code on the lockbox located in the 4th bedroom storage closet to access your items.'}</p>
        <p><strong>Access expires:</strong> ${expiryDate}</p>
      </div>
      
      <div style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:15px;margin:20px 0;">
        <h4>📋 Order Details</h4>
        ${items.map(item => `
          <div style="margin:8px 0;">
            <strong>${item.name}</strong> (Qty: ${item.quantity})
          </div>
        `).join('')}
      </div>
      
      <p>Your items will be available in the storage closet. Please return all items before checkout.</p>
      <p>Enjoy your stay at The Mesquite Retreat!</p>
    </div>`,
    tag: 'payment_confirmation'
  });
}

async function sendAdminInvoiceNotification(invoiceData) {
  const { invoice_number, customer_email, customer_name, total_amount, items, check_in_date, check_out_date } = invoiceData;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_FROM || 'admin@mesquiteretreat.com';
  
  return sendEmail({
    to: adminEmail,
    subject: `New Invoice Payment: #${invoice_number}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>💰 New Invoice Payment</h2>
      <p>A guest has paid for additional items!</p>
      
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
        <h3>Invoice Details</h3>
        <p><strong>Invoice:</strong> #${invoice_number}</p>
        <p><strong>Customer:</strong> ${customer_name || 'N/A'} (${customer_email})</p>
        <p><strong>Amount:</strong> $${total_amount}</p>
        <p><strong>Check-in:</strong> ${check_in_date ? new Date(check_in_date).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Check-out:</strong> ${check_out_date ? new Date(check_out_date).toLocaleDateString() : 'N/A'}</p>
      </div>
      
      <div style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:15px;margin:20px 0;">
        <h4>Items Purchased</h4>
        ${items.map(item => `
          <div style="margin:8px 0;">
            <strong>${item.name}</strong> - Qty: ${item.quantity} - $${item.total_price}
          </div>
        `).join('')}
      </div>
      
      <p>Please ensure the items are available in the storage closet for the guest.</p>
    </div>`,
    tag: 'admin_notification'
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
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendAdminInvoiceNotification,
  getEmailTransportInfo
}; 