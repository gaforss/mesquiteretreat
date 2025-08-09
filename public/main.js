const propertyName = (window.PROPERTY_NAME || document.title.replace('|', '').trim()) || 'Luxury Rental';
document.getElementById('propertyName').textContent = propertyName;
document.getElementById('footerName').textContent = propertyName;
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('signupForm');
const out = document.getElementById('formMessage');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  out.textContent = 'Submitting...';
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  // Add consent and UTM + referral
  const params = new URLSearchParams(location.search);
  payload.consentRules = document.getElementById('consentRules').checked;
  payload.utm = {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
    term: params.get('utm_term') || undefined,
    content: params.get('utm_content') || undefined,
  };
  payload.ref = params.get('ref') || undefined;
  // Normalize MMM YYYY months input
  if (payload.travelMonths) {
    payload.travelMonths = String(payload.travelMonths).split(',').map(s=>s.trim()).filter(Boolean).join(', ');
  }
  // IG tasks
  const savedTasks = JSON.parse(localStorage.getItem('igTasks') || '{}');
  payload.igHandle = savedTasks.igHandle || undefined;
  payload.stars = savedTasks.stars || 0;
  payload.tasks = savedTasks.tasks || {};
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      if (data.refCode) {
        localStorage.setItem('myRefCode', data.refCode);
      }
      const needs = data.needsConfirm;
      if (data.isReturning && data.discountCode) {
        out.textContent = `Welcome back! Your returning guest code: ${data.discountCode}`;
      } else {
        out.textContent = needs ? 'Check your email to confirm your entry.' : 'You are already confirmed.';
      }
      form.reset();
    } else {
      out.textContent = data.error || 'Something went wrong.';
    }
  } catch (err) {
    out.textContent = 'Network error.';
  }
});

// Countdown timer to drawing (configure via meta tag or fallback)
const drawDateStr = document.querySelector('meta[name="draw-date"]')?.getAttribute('content') || '';
if (drawDateStr) {
  const el = document.createElement('p');
  el.className = 'form-message';
  document.querySelector('.signup-copy')?.appendChild(el);
  const update = () => {
    const diff = new Date(drawDateStr).getTime() - Date.now();
    if (diff <= 0) { el.textContent = 'Entry period closed.'; return; }
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    el.textContent = `Drawing in ${days}d ${hours}h`;
  };
  update();
  setInterval(update, 60 * 1000);
}

// Entry modal for IG traffic: show on first visit or if utm_source=ig
const shouldShowModal = (() => {
  const params = new URLSearchParams(location.search);
  if (params.get('utm_source') === 'ig' || params.get('utm_source') === 'instagram') return true;
  return !localStorage.getItem('igTasks');
})();
const entryModal = document.getElementById('entryModal');
if (entryModal && shouldShowModal) {
  entryModal.classList.remove('hidden');
  const c = entryModal.querySelector('#closeModal');
  c?.addEventListener('click', () => entryModal.classList.add('hidden'));
  const starsOut = entryModal.querySelector('#starsOut');
  const tasksEls = Array.from(entryModal.querySelectorAll('.task'));
  const tagInput = entryModal.querySelector('#tagCount');
  const igInput = entryModal.querySelector('#igHandle');
  // Simple mode: user manages checkboxes; no proof enforcement
  const updateStars = () => {
    let stars = 0;
    const tasks = {};
    tasksEls.forEach(el => { if (el.checked) { stars += Number(el.dataset.points||0); tasks[el.dataset.key] = true; } });
    const tags = Number(tagInput.value || 0);
    stars += Math.max(0, tags);
    starsOut.textContent = `Stars: ${stars}`;
    return { stars, tasks };
  };
  tasksEls.forEach(el => el.addEventListener('change', updateStars));
  tagInput.addEventListener('input', updateStars);
  updateStars();
  entryModal.querySelector('#saveTasks').addEventListener('click', () => {
    const { stars, tasks } = updateStars();
    const igHandle = igInput.value.trim();
    localStorage.setItem('igTasks', JSON.stringify({ stars, tasks, igHandle }));
    entryModal.classList.add('hidden');
  });
}

// Force dark theme
document.documentElement.classList.add('dark');

// Reviews horizontal scroll nav
const scroller = document.getElementById('reviewsScroll');
const btnPrev = document.getElementById('prevReviews');
const btnNext = document.getElementById('nextReviews');
if (scroller && btnPrev && btnNext) {
  const step = 340;
  btnPrev.addEventListener('click', () => scroller.scrollBy({ left: -step, behavior: 'smooth' }));
  btnNext.addEventListener('click', () => scroller.scrollBy({ left: step, behavior: 'smooth' }));
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const showing = getComputedStyle(siteNav).display !== 'none';
    siteNav.style.display = showing ? 'none' : 'flex';
  });
}

