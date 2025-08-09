// Newsletter functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the page
  initNewsletter();
  loadNewsletterStats();
  
  // Ensure authenticated, otherwise bounce to login
  checkAuth();
});

// Global form reference
let newsletterForm;

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
  newsletterForm = document.getElementById('newsletterForm');
  newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  
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
  const submitBtn = newsletterForm.querySelector('button[type="submit"]');
  
  // Get form data
  const formData = new FormData(newsletterForm);
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
      newsletterForm.reset();
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
  
  // Convert plain text to readable HTML for preview
  const formattedMessage = formatMessageForPreview(message);
  document.getElementById('previewBody').innerHTML = formattedMessage;
  
  // Show modal
  document.getElementById('previewModal').classList.remove('hidden');
}

// Format plain text message for preview display
function formatMessageForPreview(text) {
  // Convert bullet points to HTML lists
  text = text.replace(/^•\s+/gm, '<li>');
  text = text.replace(/^-\s+/gm, '<li>');
  
  // Wrap consecutive list items in <ul> tags
  text = text.replace(/(<li>.*?)(?=\n\n|\n$|$)/gs, '<ul>$1</ul>');
  
  // Convert double line breaks to paragraph breaks
  text = text.replace(/\n\n/g, '</p><p>');
  
  // Convert single line breaks to <br> tags (but not for list items)
  text = text.replace(/\n(?!<li>)/g, '<br>');
  
  // Wrap in paragraph tags
  text = '<p>' + text + '</p>';
  
  // Clean up empty paragraphs
  text = text.replace(/<p><\/p>/g, '');
  text = text.replace(/<p>\s*<\/p>/g, '');
  
  return text;
}

// Load email template
function loadTemplate(templateType) {
  const templates = {
    welcome: {
      subject: 'Welcome to Mesquite Retreat!',
      preview: 'We\'re excited to have you join our community.',
      message: `Welcome to Mesquite Retreat!

Hi there!

We're thrilled to welcome you to the Mesquite Retreat community. You're now part of an exclusive group that gets first access to our amazing retreat experiences.

Here's what you can expect from us:

• Early access to new retreat dates
• Exclusive promotions and discounts  
• Insider tips and travel advice
• Special member-only events

We'll be in touch soon with exciting updates!

Best regards,
The Mesquite Retreat Team`
    },
    promotion: {
      subject: 'New Promotion Alert!',
      preview: 'Don\'t miss out on our latest special offer.',
      message: `New Promotion Alert! 🎉

We have exciting news to share!

We've just launched a new promotion that we think you'll love. Here are the details:

SPECIAL OFFER DETAILS
What: [Describe your promotion]
When: [Valid dates]
How: [How to claim]

This offer is available for a limited time, so don't wait!

Ready to book? Reply to this email or visit our website.

Happy travels!
The Mesquite Retreat Team`
    },
    reminder: {
      subject: 'Reminder: Your Retreat Awaits',
      preview: 'A gentle reminder about your upcoming adventure.',
      message: `Your Retreat Awaits! ⏰

Hi there!

This is just a friendly reminder that your retreat experience is coming up soon. We want to make sure you're fully prepared for an amazing time.

Here's what to remember:

• Check your confirmation details
• Pack according to the weather forecast
• Arrive 15 minutes early for check-in
• Bring your ID and confirmation

If you have any questions or need to make changes, please don't hesitate to reach out.

We're looking forward to seeing you!

Best regards,
The Mesquite Retreat Team`
    },
    newsletter: {
      subject: 'Monthly Update - What\'s New at Mesquite Retreat',
      preview: 'Stay updated with our latest news and upcoming events.',
      message: `Monthly Update - What's New at Mesquite Retreat

Hello from the Mesquite Retreat team!

We hope this email finds you well. Here's what's been happening and what's coming up:

📅 UPCOMING EVENTS
Mark your calendars for these exciting events:

• [Event 1] - [Date]
• [Event 2] - [Date]  
• [Event 3] - [Date]

🌟 NEW FEATURES
We've been working hard to improve your experience:

• [Feature 1]
• [Feature 2]
• [Feature 3]

💡 TRAVEL TIPS
This month's travel advice:

[Your travel tip content here]

🎯 SPECIAL OFFERS
Don't miss these limited-time opportunities:

[Promotion details]

As always, if you have any questions or feedback, we'd love to hear from you.

Happy travels!
The Mesquite Retreat Team`
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
  const formData = new FormData(newsletterForm);
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
  console.log('Loading newsletter stats...');
  try {
    const response = await fetch('/api/newsletter/stats', { credentials: 'include' });
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    // Check if response is ok and contains JSON
    if (!response.ok) {
      console.warn('Newsletter stats endpoint not found or error:', response.status);
      return;
    }
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Newsletter stats endpoint returned non-JSON response');
      console.warn('Response text preview:', await response.text().then(t => t.substring(0, 200)));
      return;
    }
    
    const data = await response.json();
    console.log('Parsed data:', data);
    
    if (data.ok) {
      document.getElementById('totalSent').textContent = data.totalSent || 0;
      document.getElementById('openRate').textContent = (data.openRate || 0) + '%';
      document.getElementById('clickRate').textContent = (data.clickRate || 0) + '%';
      document.getElementById('subscribers').textContent = data.subscribers || 0;
    }
  } catch (err) {
    console.error('Failed to load newsletter stats:', err);
    // Don't show error to user since this endpoint doesn't exist yet
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