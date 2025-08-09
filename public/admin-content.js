async function ensureAuth(){
  try{
    const r = await fetch('/api/auth/me', { credentials:'include' });
    const j = await r.json(); if (!j.ok) location.href = '/login.html';
  }catch{ location.href = '/login.html'; }
}

function toast(message, isError=false){
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = message; el.classList.remove('hidden');
  el.style.borderColor = isError ? 'rgba(255,77,79,.6)' : 'rgba(255,255,255,.12)';
  el.style.boxShadow = isError ? '0 10px 30px rgba(255,77,79,.25)' : '0 10px 30px rgba(0,0,0,.4)';
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(()=> el.classList.add('hidden'), 2600);
}

function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k==='class') e.className = v; else if (k==='text') e.textContent = v; else e.setAttribute(k, v);
  });
  children.forEach(c=> e.appendChild(c));
  return e;
}

function bindLogout(){
  const btn = document.getElementById('logout');
  btn?.addEventListener('click', async ()=>{ await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); location.href='/login.html'; });
}

function renderFeatures(features){
  const wrap = document.getElementById('featuresWrap'); wrap.innerHTML='';
  (features||[]).forEach((f,idx)=>{
    const row = el('div', { class:'field-row list-row' }, [
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Emoji'), el('input', { value: f.emoji||'', 'data-idx': String(idx), 'data-key':'emoji' }) ]) ]),
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Title'), el('input', { value: f.title||'', 'data-idx': String(idx), 'data-key':'title' }) ]) ]),
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Subtitle'), el('input', { value: f.subtitle||'', 'data-idx': String(idx), 'data-key':'subtitle' }) ]) ]),
      el('div', { class:'list-actions' }, [
        el('button', { class:'cta secondary', type:'button', 'data-up': String(idx) }, [ document.createTextNode('↑') ]),
        el('button', { class:'cta secondary', type:'button', 'data-down': String(idx) }, [ document.createTextNode('↓') ]),
        el('button', { class:'cta danger', type:'button', 'data-del': String(idx) }, [ document.createTextNode('Remove') ])
      ])
    ]);
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-del'));
      state.features.splice(i,1); renderFeatures(state.features);
      renderPreview();
    });
  });
  wrap.querySelectorAll('[data-up]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-up')); if (i<=0) return;
      const t = state.features[i-1]; state.features[i-1] = state.features[i]; state.features[i] = t;
      renderFeatures(state.features); renderPreview();
    });
  });
  wrap.querySelectorAll('[data-down]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-down')); if (i>=state.features.length-1) return;
      const t = state.features[i+1]; state.features[i+1] = state.features[i]; state.features[i] = t;
      renderFeatures(state.features); renderPreview();
    });
  });
  wrap.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const i = Number(inp.getAttribute('data-idx'));
      const key = inp.getAttribute('data-key');
      state.features[i][key] = inp.value;
      renderPreview();
    });
  });
}

function renderGallery(gallery){
  const wrap = document.getElementById('galleryWrap'); wrap.innerHTML='';
  (gallery||[]).forEach((g,idx)=>{
    const row = el('div', { class:'field-row list-row' }, [
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Image URL'), el('input', { value: g.url||'', 'data-idx': String(idx), 'data-key':'url' }) ]) ]),
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Alt text'), el('input', { value: g.alt||'', 'data-idx': String(idx), 'data-key':'alt' }) ]) ]),
      el('div', { class:'list-actions' }, [
        el('button', { class:'cta secondary', type:'button', 'data-up-img': String(idx) }, [ document.createTextNode('↑') ]),
        el('button', { class:'cta secondary', type:'button', 'data-down-img': String(idx) }, [ document.createTextNode('↓') ]),
        el('button', { class:'cta danger', type:'button', 'data-del': String(idx) }, [ document.createTextNode('Remove') ])
      ])
    ]);
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-del'));
      state.gallery.splice(i,1); renderGallery(state.gallery);
      renderPreview();
    });
  });
  wrap.querySelectorAll('[data-up-img]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-up-img')); if (i<=0) return;
      const t = state.gallery[i-1]; state.gallery[i-1] = state.gallery[i]; state.gallery[i] = t;
      renderGallery(state.gallery); renderPreview();
    });
  });
  wrap.querySelectorAll('[data-down-img]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-down-img')); if (i>=state.gallery.length-1) return;
      const t = state.gallery[i+1]; state.gallery[i+1] = state.gallery[i]; state.gallery[i] = t;
      renderGallery(state.gallery); renderPreview();
    });
  });
  wrap.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const i = Number(inp.getAttribute('data-idx'));
      const key = inp.getAttribute('data-key');
      state.gallery[i][key] = inp.value;
      renderPreview();
    });
  });
}

function renderReviews(reviews){
  const wrap = document.getElementById('reviewsWrap'); wrap.innerHTML='';
  (reviews||[]).forEach((r,idx)=>{
    const row = el('div', { class:'field-row list-row' }, [
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Name'), el('input', { value: r.name||'', 'data-idx': String(idx), 'data-key':'name', 'data-type':'review' }) ]) ]),
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Stars (1-5)'), el('input', { type:'number', min:'1', max:'5', value: String(r.stars||5), 'data-idx': String(idx), 'data-key':'stars', 'data-type':'review' }) ]) ]),
      el('div', { class:'field' }, [ el('label', {}, [ document.createTextNode('Text'), el('input', { value: r.text||'', 'data-idx': String(idx), 'data-key':'text', 'data-type':'review' }) ]) ]),
      el('div', { class:'list-actions' }, [
        el('button', { class:'cta secondary', type:'button', 'data-up-rev': String(idx) }, [ document.createTextNode('↑') ]),
        el('button', { class:'cta secondary', type:'button', 'data-down-rev': String(idx) }, [ document.createTextNode('↓') ]),
        el('button', { class:'cta danger', type:'button', 'data-del-rev': String(idx) }, [ document.createTextNode('Remove') ])
      ])
    ]);
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-del-rev]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i = Number(btn.getAttribute('data-del-rev')); state.reviews.splice(i,1); renderReviews(state.reviews); renderPreview(); });
  });
  wrap.querySelectorAll('[data-up-rev]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i = Number(btn.getAttribute('data-up-rev')); if (i<=0) return; const t = state.reviews[i-1]; state.reviews[i-1]=state.reviews[i]; state.reviews[i]=t; renderReviews(state.reviews); renderPreview(); });
  });
  wrap.querySelectorAll('[data-down-rev]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const i = Number(btn.getAttribute('data-down-rev')); if (i>=state.reviews.length-1) return; const t = state.reviews[i+1]; state.reviews[i+1]=state.reviews[i]; state.reviews[i]=t; renderReviews(state.reviews); renderPreview(); });
  });
  wrap.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      if (inp.getAttribute('data-type')!=='review') return;
      const i = Number(inp.getAttribute('data-idx')); const key = inp.getAttribute('data-key');
      const val = key==='stars' ? Math.max(1, Math.min(5, Number(inp.value)||5)) : inp.value;
      state.reviews[i][key] = val; renderPreview();
    });
  });
}

async function loadContent(){
  const out = document.getElementById('formMessage'); out.textContent='Loading...';
  try{
    const r = await fetch('/api/site-content', { credentials:'include' });
    const j = await r.json();
    if (!j.ok) { out.textContent = j.error||'Failed to load'; return; }
    const c = j.content||{}; state = {
      property_name: c.property_name||'', book_url: c.book_url||'',
      hero_title: c.hero_title||'', hero_subtitle: c.hero_subtitle||'', hero_badge: c.hero_badge||'', hero_image_url: c.hero_image_url||'',
      features: c.features||[], gallery: c.gallery||[], reviews: c.reviews||[], amenities: c.amenities||[], good_to_know: c.good_to_know||[],
      details_tabs: c.details_tabs||{ home:{}, area:{}, value:{} }
    };
    document.getElementById('property_name').value = state.property_name;
    document.getElementById('book_url').value = state.book_url;
    document.getElementById('hero_title').value = state.hero_title;
    document.getElementById('hero_subtitle').value = state.hero_subtitle;
    document.getElementById('hero_badge').value = state.hero_badge;
    document.getElementById('hero_image_url').value = state.hero_image_url;
    renderFeatures(state.features);
    renderGallery(state.gallery);
    renderReviews(state.reviews);
    document.getElementById('amenities_textarea').value = (state.amenities||[]).join('\n');
    document.getElementById('good_to_know').value = (state.good_to_know||[]).join('\n');
    document.getElementById('tab_home_paragraph').value = state.details_tabs?.home?.paragraph||'';
    document.getElementById('tab_home_bullets').value = (state.details_tabs?.home?.bullets||[]).join('\n');
    document.getElementById('tab_area_paragraph').value = state.details_tabs?.area?.paragraph||'';
    document.getElementById('tab_area_bullets').value = (state.details_tabs?.area?.bullets||[]).join('\n');
    document.getElementById('tab_value_paragraph').value = state.details_tabs?.value?.paragraph||'';
    document.getElementById('tab_value_bullets').value = (state.details_tabs?.value?.bullets||[]).join('\n');
    document.getElementById('tab_value_note').value = state.details_tabs?.value?.note||'';
    out.textContent='';
    renderPreview();
  }catch{ out.textContent='Failed to load'; }
}

function bindBasics(){
  ['property_name','book_url','hero_title','hero_subtitle','hero_badge','hero_image_url'].forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener('input', ()=>{ state[id] = el.value; renderPreview(); });
  });
  document.getElementById('addFeature').addEventListener('click', ()=>{ state.features.push({ emoji:'', title:'', subtitle:'' }); renderFeatures(state.features); });
  document.getElementById('addImage').addEventListener('click', ()=>{ state.gallery.push({ url:'', alt:'' }); renderGallery(state.gallery); renderPreview(); });
  document.getElementById('addReview').addEventListener('click', ()=>{ state.reviews.push({ name:'', text:'', stars:5 }); renderReviews(state.reviews); renderPreview(); });
}

async function saveContent(){
  const out = document.getElementById('formMessage'); out.textContent='Saving...';
  const payload = {
    property_name: state.property_name,
    book_url: state.book_url,
    hero_title: state.hero_title,
    hero_subtitle: state.hero_subtitle,
    hero_badge: state.hero_badge,
    hero_image_url: state.hero_image_url,
    features: state.features,
    gallery: state.gallery,
    reviews: state.reviews,
    amenities: String(document.getElementById('amenities_textarea').value||'').split('\n').map(s=>s.trim()).filter(Boolean),
    good_to_know: String(document.getElementById('good_to_know').value||'').split('\n').map(s=>s.trim()).filter(Boolean),
    details_tabs: {
      home: { paragraph: document.getElementById('tab_home_paragraph').value, bullets: String(document.getElementById('tab_home_bullets').value||'').split('\n').map(s=>s.trim()).filter(Boolean) },
      area: { paragraph: document.getElementById('tab_area_paragraph').value, bullets: String(document.getElementById('tab_area_bullets').value||'').split('\n').map(s=>s.trim()).filter(Boolean) },
      value: { paragraph: document.getElementById('tab_value_paragraph').value, bullets: String(document.getElementById('tab_value_bullets').value||'').split('\n').map(s=>s.trim()).filter(Boolean), note: document.getElementById('tab_value_note').value }
    }
  };
  try{
    const r = await fetch('/api/site-content', { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload), credentials:'include' });
    const j = await r.json();
    if (!j.ok){ out.textContent = j.error||'Failed to save'; toast(j.error||'Failed to save', true); return; }
    out.textContent = 'Saved.'; toast('Saved');
  }catch{ out.textContent='Failed to save'; toast('Failed to save', true); }
}

let state = { features:[], gallery:[], amenities:[], good_to_know:[], details_tabs:{ home:{}, area:{}, value:{} } };

document.getElementById('btnSave')?.addEventListener('click', saveContent);
document.getElementById('btnRevert')?.addEventListener('click', loadContent);

bindLogout();
bindBasics();
ensureAuth();
loadContent();

function renderPreview(){
  try{
    const title = state.hero_title || state.property_name || 'Title';
    const badge = state.hero_badge || '';
    const sub = state.hero_subtitle || '';
    const img = state.hero_image_url || '';
    const pvTitle = document.getElementById('pv_title'); if (pvTitle) pvTitle.textContent = title;
    const pvBadge = document.getElementById('pv_badge'); if (pvBadge) pvBadge.textContent = badge || 'Badge';
    const pvSub = document.getElementById('pv_sub'); if (pvSub) pvSub.textContent = sub;
    const pvImg = document.getElementById('pv_img'); if (pvImg) { pvImg.src = img || 'https://via.placeholder.com/600x360?text=Hero+Image'; }
    const pvFeat = document.getElementById('pv_features'); if (pvFeat){ pvFeat.innerHTML='';
      (state.features||[]).forEach(f=>{ const d = el('div', { class:'pv-feature' }, [ el('span', { class:'emoji', text: f.emoji||'' }), el('span', { class:'txt', text: f.title||'' }) ]); pvFeat.appendChild(d); });
    }
    const pvGal = document.getElementById('pv_gallery'); if (pvGal){ pvGal.innerHTML=''; (state.gallery||[]).slice(0,6).forEach(g=>{ const im = el('img', { src: g.url||'', alt: g.alt||'' }); pvGal.appendChild(im); }); }
    const pvRev = document.getElementById('pv_reviews'); if (pvRev){ pvRev.innerHTML=''; (state.reviews||[]).slice(0,3).forEach(r=>{ const box = el('div', { class:'pv-review' }, [ el('div', { class:'pv-name', text: `${r.name||'Guest'} — ${'★'.repeat(Math.max(1, Math.min(5, Number(r.stars)||5)))}` }), el('div', { text: r.text||'' }) ]); pvRev.appendChild(box); }); }
  }catch{}
}

