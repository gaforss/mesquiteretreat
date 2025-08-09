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
      // Prompt bonus tasks modal after successful signup (change CTA to Close)
      if (entryModal){
        entryModal.classList.remove('hidden');
        const gotoBtn = entryModal.querySelector('#gotoSignup');
        if (gotoBtn){
          gotoBtn.textContent = 'Close';
          gotoBtn.onclick = ()=> entryModal.classList.add('hidden');
        }
        const sub = entryModal.querySelector('.mh-sub');
        if (sub){ sub.textContent = 'Increase your chances of winning by doing the following:'; }
      }
      // Show share block
      const myRef = localStorage.getItem('myRefCode');
      const shareUrl = `${location.origin}${location.pathname}?ref=${encodeURIComponent(myRef||'')}`;
      const shareBox = document.getElementById('shareAfter');
      if (shareBox){
        const link = document.getElementById('shareLink');
        if (link) link.value = shareUrl;
        shareBox.style.display = 'block';
        const btnCopy = document.getElementById('btnCopyShare');
        const btnShare = document.getElementById('btnNativeShare');
    const btnBoost = document.getElementById('btnBoostTasks');
        if (btnCopy) btnCopy.onclick = ()=>{ navigator.clipboard.writeText(shareUrl); alert('Link copied'); };
        if (btnShare) btnShare.onclick = async ()=>{
          if (navigator.share){ try{ await navigator.share({ title: 'Win a stay at Mesquite Retreat', url: shareUrl }); } catch{} }
          else { navigator.clipboard.writeText(shareUrl); alert('Link copied'); }
        };
    if (btnBoost) btnBoost.onclick = ()=>{ entryModal?.classList.remove('hidden'); };
      }
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

// Entry modal: show on first visit or utm_source=ig; includes quick "Enter now" button
const entryModal = document.getElementById('entryModal');
function initEntryModal(){
  if (!entryModal) return;
  const params = new URLSearchParams(location.search);
  const shouldShow = params.get('utm_source') === 'ig' || params.get('utm_source') === 'instagram' || !localStorage.getItem('igTasks');
  if (shouldShow) entryModal.classList.remove('hidden');
  const closeBtn = entryModal.querySelector('#closeModal');
  closeBtn?.addEventListener('click', () => entryModal.classList.add('hidden'));
  const starsOut = entryModal.querySelector('#starsOut');
  const tasksEls = []; // checkboxes removed; stars awarded on link clicks
  const tagInput = null;
  const igInput = entryModal.querySelector('#igHandle');
  const updateStars = () => {
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    let stars = Number(saved.stars||0);
    const tasks = saved.tasks||{};
    // no tag input
    starsOut.textContent = `Stars: ${stars}`;
    // Update progress and chip states from saved tasks
    const maxStars = 1+1+2+1; // remaining link tasks
    const pct = Math.min(100, Math.round((Math.min(stars, maxStars)/maxStars)*100));
    const fill = document.getElementById('starsFill'); if (fill) fill.style.width = pct+'%';
    entryModal.querySelectorAll('.task-chip').forEach(chip=>{
      const key = chip.getAttribute('data-chip'); if (tasks[key]) chip.classList.add('active');
    });
    return { stars, tasks };
  };
  // On outbound visit click, award points and mark task complete in memory
  entryModal.querySelectorAll('.visit-task').forEach(a=>{
    a.addEventListener('click', ()=>{
      const key = a.getAttribute('data-task');
      const pts = Number(a.getAttribute('data-points')||0);
      const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
      const tasks = saved.tasks||{}; const current = saved.stars||0;
      if (!tasks[key]){
        tasks[key] = true;
        const stars = current + pts;
        localStorage.setItem('igTasks', JSON.stringify({ ...saved, tasks, stars }));
        const starsOut = entryModal.querySelector('#starsOut');
        if (starsOut) starsOut.textContent = `Stars: ${stars}`;
        const chip = entryModal.querySelector(`.task-chip[data-chip="${key}"]`);
        if (chip) chip.classList.add('active');
      }
    });
  });
  tasksEls.forEach(el => el.addEventListener('change', updateStars));
  // no tag input listener
  updateStars();
  // Auto-save IG handle on input
  igInput.addEventListener('input', ()=>{
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    saved.igHandle = igInput.value.trim();
    localStorage.setItem('igTasks', JSON.stringify(saved));
  });
  const goto = entryModal.querySelector('#gotoSignup');
  goto?.addEventListener('click', ()=>{
    entryModal.classList.add('hidden');
    document.getElementById('email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('email')?.focus();
  });
}
initEntryModal();

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

// Public entries today counter
(async function entriesToday(){
  const el = document.getElementById('entriesToday'); if (!el) return;
  async function tick(){
    try{
      const r = await fetch('/api/public/entries-today');
      const j = await r.json();
      if (j?.ok) el.textContent = `${j.count} entries today`;
    }catch{}
  }
  tick();
  setInterval(tick, 45 * 1000);
})();

// Add to calendar link under signup copy
(function addToCal(){
  const drawDateStr2 = document.querySelector('meta[name="draw-date"]')?.getAttribute('content') || '';
  const addWrap = document.getElementById('addToCalWrap');
  if (!drawDateStr2 || !addWrap) return;
  const title = encodeURIComponent('Mesquite Retreat Giveaway Drawing');
  const start = new Date(drawDateStr2).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0,15)+'Z';
  const end = new Date(new Date(drawDateStr2).getTime()+60*60*1000).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0,15)+'Z';
  const details = encodeURIComponent('Tune in for the drawing! Boost your chances by sharing your link.');
  const location = encodeURIComponent('Online');
  const gcal = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  addWrap.innerHTML = `<a class="cta secondary" href="${gcal}" target="_blank" rel="noopener">Add drawing to Google Calendar</a>`;
})();


