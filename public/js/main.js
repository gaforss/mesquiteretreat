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
    // Features - DISABLED TO KEEP 6 FEATURES FROM HTML
    // if (Array.isArray(c.features)){
    //   const wrap = document.querySelector('.hero .features') || document.querySelector('.features'); if (wrap){
    //     wrap.innerHTML = '';
    //     c.features.forEach(f=>{
    //       const div = document.createElement('div'); div.className='feature';
    //       div.innerHTML = `
    //         <div class="feat-text">
    //           <div class="feat-title">${f.title||''}</div>
    //           <div class="feat-sub">${f.subtitle||''}</div>
    //         </div>
    //         <div class="feat-icon"><span class="emoji">${f.emoji||''}</span></div>
    //       `;
    //       wrap.appendChild(div);
    //     });
    //   }
    // }
    // Badge overlay inside hero
    const heroEl = document.querySelector('.hero');
    if (heroEl){
      let ov = document.getElementById('heroBadgeOverlay');
      if (!ov){ ov = document.createElement('div'); ov.id = 'heroBadgeOverlay'; ov.className = 'hero-badge'; heroEl.appendChild(ov); }
      const ratingNum = Number(c.rating_value);
      const countNum = Number(c.reviews_count);
      const rating = isFinite(ratingNum) && ratingNum>0 ? ratingNum.toFixed(1) : '5.0';
      const count = isFinite(countNum) && countNum>0 ? countNum : 12;
      const isSuperhost = /superhost/i.test(c.host_line||'');
      const topHl = (Array.isArray(c.highlights)?c.highlights:[]).find(h=>/top\s*5%/i.test(h?.title||'') || /top\s*5%/i.test(h?.description||''));
      ov.innerHTML = `
        <div class="ab-badge" aria-label="${c.badge_title||'Guest favorite'}">
          <div class="ab-row">
            <span class="ab-pill ab-guest">
              <span class="ab-star">★</span>
              <span>${c.badge_title||'Guest favorite'}</span>
            </span>
            ${(c.show_superhost_pill||isSuperhost)?'<span class="ab-pill ab-superhost">SUPERHOST</span>':''}
            ${(c.show_top_percent_pill||topHl)?`<span class=\"ab-pill ab-top\">Top 5% of homes</span>`:''}
          </div>
          <div class="ab-lines">
            ${c.badge_description?`<div class=\"ab-line ab-desc\">${c.badge_description}</div>`:''}
            <div class="ab-line ab-meta"><span class="stars">${'★'.repeat(Math.round(Number(c.rating_value||5)))}</span> ${rating} · ${count} reviews</div>
            ${c.host_line?`<div class=\"ab-line ab-host\">${c.host_line}</div>`:''}
          </div>
        </div>
      `;
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
        ensureReviewsOverflow(scroll);
        initReviewsScroller();
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
  // Add consent, newsletter, and UTM + referral
  const params = new URLSearchParams(location.search);
  payload.consentRules = document.getElementById('consentRules').checked;
  payload.newsletter = document.getElementById('newsletter').checked;
  payload.utm = {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
    term: params.get('utm_term') || undefined,
    content: params.get('utm_content') || undefined,
  };
  // If no UTM on URL, fall back to sticky UTMs saved earlier
  try{
    if (!payload.utm.source && !payload.utm.medium && !payload.utm.campaign){
      const sticky = JSON.parse(localStorage.getItem('stickyUtm')||'{}');
      if (sticky && Object.keys(sticky).length){
        payload.utm = {
          source: sticky.utm_source || sticky.source || payload.utm.source,
          medium: sticky.utm_medium || sticky.medium || payload.utm.medium,
          campaign: sticky.utm_campaign || sticky.campaign || payload.utm.campaign,
          term: sticky.utm_term || sticky.term || payload.utm.term,
          content: sticky.utm_content || sticky.content || payload.utm.content,
        };
      }
    }
  }catch{}
  payload.ref = params.get('ref') || undefined;
  // Include vendor attribution if present
  try{
    const vendor = params.get('vendor') || localStorage.getItem('vendorCode');
    if (vendor) payload.vendor = vendor.toUpperCase();
  }catch{}

  // IG tasks and bonus stars
  const savedTasks = JSON.parse(localStorage.getItem('igTasks') || '{}');
  payload.igHandle = savedTasks.igHandle || undefined;
  
  // Calculate bonus stars (Instagram bonus is handled server-side)
  let bonusStars = Number(savedTasks.stars || 0);
  
  // Check if user came from Instagram (various UTM patterns)
  const isFromInstagram = payload.utm?.source === 'ig' || payload.utm?.source === 'instagram' || payload.utm?.medium === 'social' || payload.utm?.campaign?.includes('instagram');
  if (isFromInstagram && !savedTasks.instagramBonusAwarded) {
    bonusStars += 1;
    savedTasks.instagramBonusAwarded = true;
    savedTasks.stars = bonusStars;
    localStorage.setItem('igTasks', JSON.stringify(savedTasks));
  }
  
  payload.stars = bonusStars;
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
        
        // Show success modal
        const successModal = document.getElementById('successModal');
        if (successModal) {
          successModal.classList.remove('hidden');
          
          // Close button functionality
          const closeBtn = successModal.querySelector('#closeSuccessModal');
          const closeSuccessBtn = successModal.querySelector('#closeSuccessBtn');
          
          const closeSuccessModal = () => {
            successModal.classList.add('hidden');
          };
          
          closeBtn?.addEventListener('click', closeSuccessModal);
          closeSuccessBtn?.addEventListener('click', closeSuccessModal);
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

// Promotion-aware: fetch active promotion to power countdown and copy
(async function hydratePromotion(){
  try{
    const r = await fetch('/api/promotions/public/active');
    const j = await r.json();
    if (j?.ok && j.row){
      const p = j.row;
      // Set hero badge/cta hints if present
    const banner = document.getElementById('addToCalWrap');
    const copyWrap = document.querySelector('.signup-copy');
    if (copyWrap){
      const wrap = document.createElement('div');
      wrap.className = 'promo-pill-wrap';
      const info = document.createElement('span');
      info.className = 'promo-pill';
      const fmt = (d)=> d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
      const start = fmt(p.start_date);
      const end = fmt(p.end_date);
      const draw = fmt(p.draw_date);
      const windowText = (start && end) ? `${start}–${end}` : (end ? `Ends ${end}` : (start ? `Starts ${start}` : ''));
      const primary = `${p.title||'Giveaway'}${windowText?` · ${windowText}`:''}`;
      const secondary = draw ? `Winner drawn ${draw}` : '';
      info.innerHTML = `<span class="emoji">🎁</span><span class="promo-text"><span class="promo-main">${primary}</span>${secondary?`<span class="promo-sub">${secondary}</span>`:''}</span>`;
      wrap.appendChild(info);
      copyWrap.insertBefore(wrap, copyWrap.firstChild?.nextSibling || copyWrap.firstChild);
    } else if (banner){
      const fmt = (d)=> d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
      const start = fmt(p.start_date);
      const end = fmt(p.end_date);
      const draw = fmt(p.draw_date);
      const windowText = (start && end) ? `${start}–${end}` : (end ? `Ends ${end}` : (start ? `Starts ${start}` : ''));
      const primary = `${p.title||'Giveaway'}${windowText?` · ${windowText}`:''}`;
      const secondary = draw ? `Winner drawn ${draw}` : '';
      banner.insertAdjacentHTML('afterbegin', `<div class="promo-pill-wrap"><span class="promo-pill"><span class="emoji">🎁</span><span class="promo-text"><span class="promo-main">${primary}</span>${secondary?`<span class="promo-sub">${secondary}</span>`:''}</span></span></div>`);
    }
      // Prefer promotion draw date; fall back to meta
      const promoDrawDate = p.draw_date ? new Date(p.draw_date).toISOString() : '';
      initCountdown(promoDrawDate);
      return;
    }
  }catch{}
  // Fallback to meta if no active promotion
  const drawDateStr = document.querySelector('meta[name="draw-date"]')?.getAttribute('content') || '';
  initCountdown(drawDateStr);
})();

function initCountdown(drawDateStr){
  if (!drawDateStr) return;
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
  
  // Modal form elements
  const modalForm = entryModal.querySelector('#modalSignupForm');
  const modalEmail = entryModal.querySelector('#modalEmail');
  const modalFirstName = entryModal.querySelector('#modalFirstName');
  const modalNewsletter = entryModal.querySelector('#modalNewsletter');
  const modalConsentRules = entryModal.querySelector('#modalConsentRules');
  const modalFormMessage = entryModal.querySelector('#modalFormMessage');
  const modalStarsOut = entryModal.querySelector('#modalStarsOut');
  const modalStarsFill = entryModal.querySelector('#modalStarsFill');
  const modalIgHandle = entryModal.querySelector('#modalIgHandle');
  
  // Pre-fill IG handle from saved tasks
  try{
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    if (modalIgHandle && saved.igHandle) modalIgHandle.value = saved.igHandle;
  }catch{}
  
  const updateStars = () => {
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    let stars = Number(saved.stars||0);
    
    // Check if user came from Instagram (various UTM patterns)
    const params = new URLSearchParams(location.search);
    const isFromInstagram = params.get('utm_source') === 'ig' || params.get('utm_source') === 'instagram' || params.get('utm_medium') === 'social' || params.get('utm_campaign')?.includes('instagram');
    
    // Award 1 star for Instagram referral
    if (isFromInstagram && !saved.instagramBonusAwarded) {
      stars += 1;
      saved.instagramBonusAwarded = true;
      saved.stars = stars;
      localStorage.setItem('igTasks', JSON.stringify(saved));
    }
    
    modalStarsOut.textContent = `Bonus entries: ${stars}`;
    
    // Update progress bar
    const maxStars = 2; // Instagram bonus + referral bonus
    const pct = Math.min(100, Math.round((Math.min(stars, maxStars)/maxStars)*100));
    if (modalStarsFill) modalStarsFill.style.width = pct+'%';
    
    return { stars, tasks: saved.tasks || {} };
  };
  
  // Auto-save IG handle on input
  modalIgHandle?.addEventListener('input', ()=>{
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    saved.igHandle = modalIgHandle.value.trim();
    localStorage.setItem('igTasks', JSON.stringify(saved));
  });
  
  // Handle modal form submission
  modalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = modalEmail.value.trim();
    const firstName = modalFirstName.value.trim();
    const newsletter = modalNewsletter.checked;
    const consentRules = modalConsentRules.checked;
    
    if (!email || !consentRules || !newsletter) {
      modalFormMessage.textContent = 'Please provide your email, subscribe to the newsletter, and agree to the rules.';
      modalFormMessage.className = 'form-message error';
      return;
    }
    
    // Get bonus entries from completed tasks
    const saved = JSON.parse(localStorage.getItem('igTasks')||'{}');
    const bonusEntries = Number(saved.stars||0);
    
    try {
      modalFormMessage.textContent = 'Submitting your entry...';
      modalFormMessage.className = 'form-message loading';
      
      const formData = {
        email: email,
        firstName: firstName || '',
        lastName: '',
        tripType: '',
        groupSize: '',
        phone: '',
        igHandle: modalIgHandle.value.trim() || '',
        stars: bonusEntries,
        newsletter: newsletter,
        consentRules: consentRules
      };
      
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.ok) {
        // Close entry modal
        entryModal.classList.add('hidden');
        
        // Show success modal
        const successModal = document.getElementById('successModal');
        if (successModal) {
          successModal.classList.remove('hidden');
          
          // Close button functionality
          const closeBtn = successModal.querySelector('#closeSuccessModal');
          const closeSuccessBtn = successModal.querySelector('#closeSuccessBtn');
          
          const closeSuccessModal = () => {
            successModal.classList.add('hidden');
          };
          
          closeBtn?.addEventListener('click', closeSuccessModal);
          closeSuccessBtn?.addEventListener('click', closeSuccessModal);
        }
        
        // Clear form
        modalForm.reset();
        
      } else {
        modalFormMessage.textContent = result.error || 'Failed to submit entry. Please try again.';
        modalFormMessage.className = 'form-message error';
      }
      
    } catch (error) {
      console.error('Modal form submission error:', error);
      modalFormMessage.textContent = 'Network error. Please try again.';
      modalFormMessage.className = 'form-message error';
    }
  });
  
  // Handle "Complete full entry form" button
  const gotoFullSignup = entryModal.querySelector('#gotoFullSignup');
  gotoFullSignup?.addEventListener('click', ()=>{
    entryModal.classList.add('hidden');
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Pre-fill the main form with modal data
    const mainEmail = document.getElementById('email');
    const mainFirstName = document.getElementById('firstName');
    if (mainEmail && modalEmail.value) mainEmail.value = modalEmail.value;
    if (mainFirstName && modalFirstName.value) mainFirstName.value = modalFirstName.value;
    mainEmail?.focus();
  });
  
  updateStars();
}
initEntryModal();

// Force dark theme
document.documentElement.classList.add('dark');

// Reviews horizontal scroll nav (re-initializes after DOM updates)
function initReviewsScroller(){
  document.addEventListener('click', (e)=>{
    const t = e.target; if (!t) return;
    const id = t.id || (t.closest && t.closest('#prevReviews, #nextReviews')?.id);
    if (id !== 'prevReviews' && id !== 'nextReviews') return;
    const scroller = document.getElementById('reviewsScroll'); if (!scroller) return;
    const dir = id === 'prevReviews' ? -1 : 1;
    const firstCard = scroller.querySelector('.card');
    const step = Math.max(320, (firstCard?.offsetWidth||0) + 12);
    const before = scroller.scrollLeft;
    // Force a small overflow if equal widths to allow scroll
    if (scroller.scrollWidth <= scroller.clientWidth) { scroller.style.paddingRight = '1px'; }
    scroller.scrollBy({ left: dir * step, behavior: 'smooth' });
    try { console.log('[reviews] click', { id, before, after: scroller.scrollLeft, scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth }); } catch {}
  }, { passive: true });
}
initReviewsScroller();

function ensureReviewsOverflow(scroller){
  try{
    const cards = scroller.querySelectorAll('.card');
    if (cards.length){
      cards.forEach(c=>{ c.style.minWidth = '300px'; c.style.maxWidth = '340px'; c.style.scrollSnapAlign = 'start'; });
      scroller.style.display = 'flex';
      scroller.style.gap = '12px';
      scroller.style.overflowX = 'auto';
      scroller.style.scrollSnapType = 'x mandatory';
      scroller.style.webkitOverflowScrolling = 'touch';
      requestAnimationFrame(()=>{
        if (scroller.scrollWidth <= scroller.clientWidth) {
          // Append a tiny spacer to force horizontal overflow
          if (!scroller.querySelector('[data-spacer="1"]')){
            const spacer = document.createElement('div');
            spacer.dataset.spacer = '1';
            spacer.style.flex = '0 0 24px';
            spacer.style.width = '24px';
            spacer.style.height = '1px';
            spacer.style.pointerEvents = 'none';
            scroller.appendChild(spacer);
            try { console.log('[reviews] spacer added to force overflow'); } catch {}
          }
        }
      });
    }
  }catch{}
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
if (navToggle && siteNav) {
  const header = document.querySelector('.site-header');
  function setOpen(open){
    if (!header) return;
    header.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    // Swap icon
    navToggle.textContent = open ? '✕' : '☰';
  }
  navToggle.addEventListener('click', () => {
    const isOpen = document.querySelector('.site-header')?.classList.contains('open');
    setOpen(!isOpen);
  });
  // Close on escape and outside click
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') setOpen(false); }, { passive: true });
  document.addEventListener('click', (e)=>{
    const t = e.target;
    const open = document.querySelector('.site-header')?.classList.contains('open');
    if (!open) return;
    if (t && (t.closest && (t.closest('#siteNav') || t.closest('#navToggle')))) return;
    setOpen(false);
  });
  // Reset on resize to desktop
  window.addEventListener('resize', ()=>{
    if (window.innerWidth > 880) setOpen(false);
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
  // Use active promotion if available (set earlier), else fallback meta
  const drawDateStr2 = (window.__promoDrawIso) || document.querySelector('meta[name="draw-date"]')?.getAttribute('content') || '';
  const addWrap = document.getElementById('addToCalWrap');
  if (!drawDateStr2 || !addWrap) return;
  const title = encodeURIComponent('Mesquite Retreat Giveaway Drawing');
  const start = new Date(drawDateStr2).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0,15)+'Z';
  const end = new Date(new Date(drawDateStr2).getTime()+60*60*1000).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0,15)+'Z';
  const details = encodeURIComponent('Tune in for the drawing! Boost your chances by sharing your link.');
  const location = encodeURIComponent('Online');
  const gcal = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  // Also provide ICS download for Apple/Outlook
  const ics = (()=>{
    const lines = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MesquiteRetreat//Giveaway//EN','BEGIN:VEVENT',
      `UID:${Date.now()}@mesquiteretreat`,`DTSTAMP:${start}`,
      `DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:Mesquite Retreat Giveaway Drawing`,`DESCRIPTION:Tune in for the drawing! Boost your chances by sharing your link.`,`LOCATION:Online`,'END:VEVENT','END:VCALENDAR'
    ];
    return 'data:text/calendar;charset=utf8,'+encodeURIComponent(lines.join('\r\n'));
  })();
  addWrap.innerHTML = `<a class="cta secondary" href="${gcal}" target="_blank" rel="noopener">Add to Google Calendar</a> <a class="cta secondary" href="${ics}" download="mesquite-drawing.ics">Download ICS</a>`;
})();

// Persist UTM params for later submissions (sticky attribution)
(function persistUtm(){
  try{
    const params = new URLSearchParams(location.search);
    const utm = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].reduce((acc,k)=>{ const v=params.get(k); if(v) acc[k]=v; return acc; },{});
    if (Object.keys(utm).length){ localStorage.setItem('stickyUtm', JSON.stringify(utm)); }
  }catch{}
})();

// Persist vendor code and track landing
(function persistVendor(){
  try{
    const params = new URLSearchParams(location.search);
    const vendor = params.get('vendor');
    if (vendor){ localStorage.setItem('vendorCode', vendor.toUpperCase()); }
    const code = vendor || localStorage.getItem('vendorCode');
    if (code){ fetch(`/api/public/track?vendor=${encodeURIComponent(code)}&type=landing`).catch(()=>{}); }
  }catch{}
})();


// Header/topbar scrolled state + active link highlight
(function polishNavbars(){
  const header = document.querySelector('.site-header');
  const topbar = document.querySelector('.topbar');
  const onScroll = () => {
    const sc = (document.documentElement.scrollTop || document.body.scrollTop) > 6;
    if (header) header.classList.toggle('scrolled', sc);
    if (topbar) topbar.classList.toggle('scrolled', sc);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mark current link active if same pathname anchor
  try{
    const here = location.pathname.replace(/\/index\.html?$/, '/');
    document.querySelectorAll('nav a[href]').forEach(a=>{
      const url = new URL(a.href, location.origin);
      const match = url.pathname.replace(/\/index\.html?$/, '/') === here && (!url.hash || url.hash === location.hash);
      if (match) a.classList.add('active');
    });
  }catch{}
})();




