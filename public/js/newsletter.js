// Newsletter functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the page
  initNewsletter();
  loadNewsletterStats();
  
  // Ensure authenticated, otherwise bounce to login
  checkAuth();
});

// Check authentication
async function checkAuth() {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const j = await r.json();
    if (!j.ok) location.href = '/login.html';
  } catch {
    location.href = '/login.html';
  }
}

// Initialize newsletter functionality
function initNewsletter() {
  // Form submission
  const form = document.getElementById('newsletterForm');
  form.addEventListener('submit', handleNewsletterSubmit);
  
  // Schedule options toggle
  const scheduleSelect = document.getElementById('schedule');
  scheduleSelect.addEventListener('change', toggleScheduleOptions);
  
  // Preview button
  const previewBtn = document.getElementById('previewBtn');
  previewBtn.addEventListener('click', showPreview);
  
  // Save draft button
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  saveDraftBtn.addEventListener('click', saveDraft);
  
  // Template buttons
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.template));
  });
  
  // Logout
  document.getElementById('logout').addEventListener('click', handleLogout);
  
  // Modal close handlers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });
}

// Handle newsletter form submission
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  
  const messageEl = document.getElementById('newsletterMessage');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Get form data
  const formData = new FormData(form);
  const data = {
    subject: formData.get('subject'),
    preview: formData.get('preview'),
    message: formData.get('message'),
    sendTo: formData.get('sendTo'),
    schedule: formData.get('schedule'),
    scheduleDate: formData.get('scheduleDate'),
    scheduleTime: formData.get('scheduleTime'),
    sendTest: formData.get('sendTest') === 'on',
    trackOpens: formData.get('trackOpens') === 'on',
    trackClicks: formData.get('trackClicks') === 'on',
    unsubscribeLink: formData.get('unsubscribeLink') === 'on'
  };
  
  // Validation
  if (!data.subject.trim() || !data.message.trim()) {
    showMessage('Please fill in all required fields.', 'error');
    return;
  }
  
  if (data.schedule === 'later' && (!data.scheduleDate || !data.scheduleTime)) {
    showMessage('Please select a date and time for scheduling.', 'error');
    return;
  }
  
  // Disable submit button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  messageEl.textContent = 'Preparing newsletter...';
  
  try {
    // If send test is checked, send test first
    if (data.sendTest) {
      messageEl.textContent = 'Sending test email...';
      const testResult = await sendTestEmail(data);
      if (!testResult.ok) {
        showMessage('Test email failed: ' + testResult.error, 'error');
        return;
      }
      messageEl.textContent = 'Test email sent successfully! Sending to subscribers...';
    }
    
    // Send newsletter
    const response = await fetch('/api/newsletter/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.ok) {
      showMessage(`Newsletter sent successfully to ${result.count} subscribers!`, 'success');
      form.reset();
      loadNewsletterStats(); // Refresh stats
    } else {
      showMessage(result.error || 'Failed to send newsletter.', 'error');
    }
  } catch (err) {
    showMessage('Network error. Please try again.', 'error');
    console.error('Newsletter error:', err);
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Newsletter';
  }
}

// Send test email
async function sendTestEmail(data) {
  try {
    const response = await fetch('/api/newsletter/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return await response.json();
  } catch (err) {
    return { ok: false, error: 'Network error' };
  }
}

// Toggle schedule options visibility
function toggleScheduleOptions() {
  const scheduleOptions = document.getElementById('scheduleOptions');
  const scheduleSelect = document.getElementById('schedule');
  
  if (scheduleSelect.value === 'later') {
    scheduleOptions.style.display = 'flex';
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('scheduleDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('scheduleTime').value = '09:00';
  } else {
    scheduleOptions.style.display = 'none';
  }
}

// Show email preview
function showPreview() {
  const subject = document.getElementById('subject').value.trim();
  const message = document.getElementById('message').value.trim();
  
  if (!subject || !message) {
    showMessage('Please fill in subject and message to preview.', 'error');
    return;
  }
  
  // Update preview modal
  document.getElementById('previewSubject').textContent = subject;
  document.getElementById('previewBody').innerHTML = message;
  
  // Show modal
  document.getElementById('previewModal').classList.remove('hidden');
}

// Load email template
function loadTemplate(templateType) {
  const templates = {
    welcome: {
      subject: 'Welcome to Mesquite Retreat!',
      preview: 'We\'re excited to have you join our community.',
      message: `<h2>Welcome to Mesquite Retreat!</h2>
<p>Hi there!</p>
<p>We're thrilled to welcome you to the Mesquite Retreat community. You're now part of an exclusive group that gets first access to our amazing retreat experiences.</p>
<p>Here's what you can expect from us:</p>
<ul>
<li>Early access to new retreat dates</li>
<li>Exclusive promotions and discounts</li>
<li>Insider tips and travel advice</li>
<li>Special member-only events</li>
</ul>
<p>We'll be in touch soon with exciting updates!</p>
<p>Best regards,<br>The Mesquite Retreat Team</p>`
    },
    promotion: {
      subject: 'New Promotion Alert!',
      preview: 'Don\'t miss out on our latest special offer.',
      message: `<h2>New Promotion Alert! 🎉</h2>
<p>We have exciting news to share!</p>
<p>We've just launched a new promotion that we think you'll love. Here are the details:</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3>Special Offer Details</h3>
<p><strong>What:</strong> [Describe your promotion]</p>
<p><strong>When:</strong> [Valid dates]</p>
<p><strong>How:</strong> [How to claim]</p>
</div>
<p>This offer is available for a limited time, so don't wait!</p>
<p>Ready to book? Reply to this email or visit our website.</p>
<p>Happy travels!<br>The Mesquite Retreat Team</p>`
    },
    reminder: {
      subject: 'Reminder: Your Retreat Awaits',
      preview: 'A gentle reminder about your upcoming adventure.',
      message: `<h2>Your Retreat Awaits! ⏰</h2>
<p>Hi there!</p>
<p>This is just a friendly reminder that your retreat experience is coming up soon. We want to make sure you're fully prepared for an amazing time.</p>
<p>Here's what to remember:</p>
<ul>
<li>Check your confirmation details</li>
<li>Pack according to the weather forecast</li>
<li>Arrive 15 minutes early for check-in</li>
<li>Bring your ID and confirmation</li>
</ul>
<p>If you have any questions or need to make changes, please don't hesitate to reach out.</p>
<p>We're looking forward to seeing you!</p>
<p>Best regards,<br>The Mesquite Retreat Team</p>`
    },
    newsletter: {
      subject: 'Monthly Update - What\'s New at Mesquite Retreat',
      preview: 'Stay updated with our latest news and upcoming events.',
      message: `<h2>Monthly Update - What's New at Mesquite Retreat</h2>
<p>Hello from the Mesquite Retreat team!</p>
<p>We hope this email finds you well. Here's what's been happening and what's coming up:</p>

<h3>📅 Upcoming Events</h3>
<p>Mark your calendars for these exciting events:</p>
<ul>
<li>[Event 1] - [Date]</li>
<li>[Event 2] - [Date]</li>
<li>[Event 3] - [Date]</li>
</ul>

<h3>🌟 New Features</h3>
<p>We've been working hard to improve your experience:</p>
<ul>
<li>[Feature 1]</li>
<li>[Feature 2]</li>
<li>[Feature 3]</li>
</ul>

<h3>💡 Travel Tips</h3>
<p>This month's travel advice:</p>
<p>[Your travel tip content here]</p>

<h3>🎯 Special Offers</h3>
<p>Don't miss these limited-time opportunities:</p>
<p>[Promotion details]</p>

<p>As always, if you have any questions or feedback, we'd love to hear from you.</p>
<p>Happy travels!<br>The Mesquite Retreat Team</p>`
    }
  };
  
  const template = templates[templateType];
  if (template) {
    document.getElementById('subject').value = template.subject;
    document.getElementById('preview').value = template.preview;
    document.getElementById('message').value = template.message;
    
    showMessage('Template loaded! Feel free to customize it.', 'success');
  }
}

// Save draft
async function saveDraft() {
  const formData = new FormData(form);
  const data = {
    subject: formData.get('subject'),
    preview: formData.get('preview'),
    message: formData.get('message'),
    sendTo: formData.get('sendTo'),
    schedule: formData.get('schedule'),
    scheduleDate: formData.get('scheduleDate'),
    scheduleTime: formData.get('scheduleTime'),
    sendTest: formData.get('sendTest') === 'on',
    trackOpens: formData.get('trackOpens') === 'on',
    trackClicks: formData.get('trackClicks') === 'on',
    unsubscribeLink: formData.get('unsubscribeLink') === 'on'
  };
  
  try {
    const response = await fetch('/api/newsletter/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.ok) {
      showMessage('Draft saved successfully!', 'success');
    } else {
      showMessage(result.error || 'Failed to save draft.', 'error');
    }
  } catch (err) {
    showMessage('Network error. Please try again.', 'error');
  }
}

// Load newsletter statistics
async function loadNewsletterStats() {
  try {
    const response = await fetch('/api/newsletter/stats', { credentials: 'include' });
    const data = await response.json();
    
    if (data.ok) {
      document.getElementById('totalSent').textContent = data.totalSent || 0;
      document.getElementById('openRate').textContent = (data.openRate || 0) + '%';
      document.getElementById('clickRate').textContent = (data.clickRate || 0) + '%';
      document.getElementById('subscribers').textContent = data.subscribers || 0;
    }
  } catch (err) {
    console.error('Failed to load newsletter stats:', err);
  }
}

// Show message
function showMessage(message, type = 'info') {
  const messageEl = document.getElementById('newsletterMessage');
  messageEl.textContent = message;
  messageEl.className = `form-message ${type}`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.textContent = '';
    messageEl.className = 'form-message';
  }, 5000);
  
  // Also show toast
  toast(message, type === 'error');
}

// Show toast notification
function toast(message, isError = false) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = message;
  toastEl.className = `toast ${isError ? 'error' : ''}`;
  toastEl.classList.remove('hidden');
  
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 4000);
}

// Close modals
function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// Handle logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    location.href = '/login.html';
  } catch (err) {
    location.href = '/login.html';
  }
} 