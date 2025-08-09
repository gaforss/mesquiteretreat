document.getElementById('year').textContent = new Date().getFullYear();

async function loadSiteContent(){
  try{
    const r = await fetch('/api/site-content');
    const j = await r.json();
    if (!j.ok) return;
    const c = j.content || {};
    const name = c.property_name || (window.PROPERTY_NAME || document.title.replace('|','').trim()) || 'Luxury Rental';
    const bookUrl = c.book_url || 'https://www.airbnb.com/';
    document.getElementById('propertyName').textContent = name;
    document.getElementById('footerName').textContent = name;
    document.title = `${name} | Scottsdale`;
    // Hero
    const h1 = document.getElementById('heroTitle'); if (h1) h1.textContent = c.hero_title || name;
    const heroBadge = document.querySelector('.hero .badge'); if (heroBadge) heroBadge.textContent = c.hero_badge || heroBadge.textContent;
    const heroSub = document.querySelector('.hero .hero-text p'); if (heroSub) heroSub.textContent = c.hero_subtitle || heroSub.textContent;
    const heroImg = document.querySelector('.hero-image img'); if (heroImg && c.hero_image_url) heroImg.src = c.hero_image_url;
    // Book links
    document.querySelectorAll('a.airbnb').forEach(a=>{ a.href = bookUrl; });
    // Features
    if (Array.isArray(c.features)){
      const wrap = document.querySelector('.features'); if (wrap){
        wrap.innerHTML = '';
        c.features.forEach(f=>{
          const div = document.createElement('div'); div.className='feature';
          div.innerHTML = `<span class="emoji">${f.emoji||''}</span><div><strong>${f.title||''}</strong><div class="muted">${f.subtitle||''}</div></div>`;
          wrap.appendChild(div);
        });
      }
    }
    // Gallery
    if (Array.isArray(c.gallery)){
      const gal = document.querySelector('.gallery'); if (gal){
        gal.innerHTML = '';
        c.gallery.forEach(img=>{
          const el = document.createElement('img'); el.src = img.url; el.alt = img.alt||''; gal.appendChild(el);
        });
      }
    }
    // Amenities
    if (Array.isArray(c.amenities)){
      const ul = document.querySelector('.amenities'); if (ul){ ul.innerHTML = ''; c.amenities.forEach(t=>{ const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }); }
    }
    // Good to know
    if (Array.isArray(c.good_to_know)){
      const cont = document.querySelector('.good-to-know ul'); if (cont){ cont.innerHTML=''; c.good_to_know.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; cont.appendChild(li); }); }
    }
    // Tabs
    const t = c.details_tabs||{};
    if (t.home){
      const card = document.querySelector('#tab-home .details-card'); if (card){
        card.innerHTML = '';
        if (t.home.paragraph){ const p = document.createElement('p'); p.textContent = t.home.paragraph; card.appendChild(p); }
        if (Array.isArray(t.home.bullets) && t.home.bullets.length){ const ul = document.createElement('ul'); t.home.bullets.forEach(b=>{ const li=document.createElement('li'); li.textContent=b; ul.appendChild(li); }); card.appendChild(ul); }
      }
    }
    if (t.area){
      const card = document.querySelector('#tab-area .details-card'); if (card){
        card.innerHTML = '';
        if (t.area.paragraph){ const p = document.createElement('p'); p.textContent = t.area.paragraph; card.appendChild(p); }
        if (Array.isArray(t.area.bullets) && t.area.bullets.length){ const ul = document.createElement('ul'); t.area.bullets.forEach(b=>{ const li=document.createElement('li'); li.textContent=b; ul.appendChild(li); }); card.appendChild(ul); }
      }
    }
    if (t.value){
      const card = document.querySelector('#tab-value .details-card'); if (card){
        card.innerHTML = '';
        if (t.value.paragraph){ const p = document.createElement('p'); p.textContent = t.value.paragraph; card.appendChild(p); }
        if (Array.isArray(t.value.bullets) && t.value.bullets.length){ const ul = document.createElement('ul'); t.value.bullets.forEach(b=>{ const li=document.createElement('li'); li.textContent=b; ul.appendChild(li); }); card.appendChild(ul); }
        if (t.value.note){ const p2 = document.createElement('p'); p2.className='muted small'; p2.textContent = t.value.note; card.appendChild(p2); }
      }
    }
    // Reviews
    if (Array.isArray(c.reviews)){
      const scroll = document.getElementById('reviewsScroll');
      if (scroll){
        scroll.innerHTML = '';
        c.reviews.slice(0,8).forEach(rv=>{
          const card = document.createElement('div'); card.className='card shadow-sm';
          card.innerHTML = `
            <div class="review-avatar">
              <div class="avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 3.134-8 7v1h16v-1c0-3.866-3.582-7-8-7z"/></svg>
              </div>
            </div>
            <div class="card-body">
              <p class="card-text">${escapeHtml(rv.text||'')}</p>
              <div class="small text-secondary">${escapeHtml(rv.name||'Guest')} — <span class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(rv.stars)||5)))}</span></div>
            </div>`;
          scroll.appendChild(card);
        });
      }
    }
  }catch{}
}

loadSiteContent();

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

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


