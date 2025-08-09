document.getElementById('year').textContent = new Date().getFullYear();

(async function loadOfferings(){
  try{
    const r = await fetch('/api/public/offerings');
    const j = await r.json();
    if (!j.ok) return;
    const grid = document.getElementById('vendorGrid'); if (!grid) return;
    const rows = j.rows||[];
    const searchEl = document.getElementById('search');
    const filters = document.getElementById('filters');
    function render(list){
      grid.innerHTML = '';
      list.forEach(o=>{
        const card = document.createElement('div');
        card.className = 'card';
        card.style.width = '100%';
        card.innerHTML = `<div class="card-body" style="display:grid;grid-template-columns: 1fr 1.2fr; gap:14px; align-items:start">
          <div>
            ${o.image_url?`<img src="${o.image_url}" alt="${o.title||''}" style=\"width:100%;height:260px;object-fit:cover;border-radius:12px;box-shadow:0 10px 26px rgba(0,0,0,.4)\"/>`:''}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              ${o.logo_url?`<img src="${o.logo_url}" alt="logo" style=\"width:40px;height:40px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.14)\"/>`:''}
              <h3 style="margin:0;font-size:20px">${o.title||''}</h3>
            </div>
            <div class="small text-secondary" style="margin-bottom:12px">${o.description||''}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
              ${o.discount_percent!=null?`<span class=\"chip yes\">${o.discount_percent}% off</span>`:''}
              ${o.discount_text?`<span class=\"chip\">${o.discount_text}</span>`:''}
              ${o.discount_code?`<span class=\"chip\">Code: ${o.discount_code}</span>`:''}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${o.url?`<a class=\"cta secondary\" href=\"/api/public/vendor-redirect?vendor=${encodeURIComponent(o.vendor_code||'')}&url=${encodeURIComponent(o.url||'')}\" target=\"_blank\" rel=\"noopener\">Learn more</a>`:''}
              ${o.fulfillment_type==='lead'?`<button class=\"cta\" data-request=\"${o._id}\">Request via Host</button>`:''}
            </div>
          </div>
        </div>`;
        grid.appendChild(card);
      });
      // bind request buttons
      grid.querySelectorAll('[data-request]')?.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-request');
          const m = document.getElementById('leadModal');
          document.getElementById('leadOfferingId').value = id||'';
          m?.classList.remove('hidden');
        });
      });
    }
    function apply(){
      const term = (searchEl?.value||'').toLowerCase();
      const showDiscounts = !!filters?.querySelector('.chip[data-filter="discounts"].active');
      const list = rows.filter(o=>{
        const matchesTerm = !term || [o.title,o.description,o.discount_text,o.discount_code].some(v=>String(v||'').toLowerCase().includes(term));
        const matchesDisc = !showDiscounts || (o.discount_percent!=null || (o.discount_code||o.discount_text));
        return matchesTerm && matchesDisc;
      });
      render(list);
    }
    searchEl?.addEventListener('input', apply);
    filters?.addEventListener('click', (e)=>{
      const chip = e.target?.closest?.('.chip'); if (!chip) return;
      filters.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      apply();
    });
    apply();
  }catch{}
})();

// lead form submit
document.getElementById('leadForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const out = document.getElementById('leadMsg'); out.textContent = 'Sending...';
  const payload = {
    offeringId: document.getElementById('leadOfferingId').value,
    guest_name: document.getElementById('leadName').value.trim(),
    guest_email: document.getElementById('leadEmail').value.trim(),
    guest_phone: document.getElementById('leadPhone').value.trim(),
    dates: document.getElementById('leadDates').value.trim(),
    notes: document.getElementById('leadNotes').value.trim(),
  };
  try{
    const r = await fetch('/api/public/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!j.ok){ out.textContent = j.error||'Failed'; return; }
    out.textContent = 'Request sent!';
    setTimeout(()=>{ document.getElementById('leadModal')?.classList.add('hidden'); out.textContent=''; (e.target).reset(); }, 800);
  }catch{ out.textContent = 'Failed'; }
});

// modal close
document.querySelectorAll('[data-close-modal]')?.forEach(btn=>btn.addEventListener('click', ()=>{
  document.getElementById('leadModal')?.classList.add('hidden');
}));

