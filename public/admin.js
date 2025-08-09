const form = document.getElementById('broadcastForm');
const out = document.getElementById('adminMessage');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  out.textContent = 'Sending...';
  const subject = document.getElementById('subject').value.trim();
  const message = document.getElementById('message').value.trim();
  try {
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.ok) {
      out.textContent = `Sent to ${data.count} subscribers.`;
    } else {
      out.textContent = data.error || 'Failed to send.';
    }
  } catch (err) {
    out.textContent = 'Network error.';
  }
});

// Export entrants (CSV)
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export CSV';
exportBtn.className = 'cta';
exportBtn.style.marginTop = '16px';
form.insertAdjacentElement('afterend', exportBtn);
exportBtn.addEventListener('click', async () => {
  const res = await fetch('/api/export', { credentials: 'include' });
  if (!res.ok) { out.textContent = 'Export failed.'; return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'entrants.csv'; a.click();
  URL.revokeObjectURL(url);
});

// Pick winner
const pickBtn = document.createElement('button');
pickBtn.textContent = 'Pick Winner';
pickBtn.className = 'cta';
pickBtn.style.marginLeft = '8px';
exportBtn.insertAdjacentElement('afterend', pickBtn);
pickBtn.addEventListener('click', async () => {
  const res = await fetch('/api/pick-winner', { method: 'POST', credentials: 'include' });
  const data = await res.json();
  if (data.ok) out.textContent = `Winner: ${data.winnerEmail} (from ${data.totalEntrants} confirmed entrants)`;
  else out.textContent = data.error || 'Failed to pick winner.';
});

// Admin table to browse subscribers (modern table w/ sorting + pagination)
const subsSection = document.createElement('section');
subsSection.style.marginTop = '24px';
subsSection.innerHTML = `
  <h2>Subscribers</h2>
  <div class="filters-grid">
    <div class="field"><label>Trip type</label>
      <select id="fltTrip"><option value="">All</option><option value="family">Family</option><option value="golf">Golf</option><option value="work">Work</option><option value="friends">Friends</option></select>
    </div>
    <div class="field"><label>Search</label><input id="fltQ" placeholder="email or name" /></div>
    <div class="field"><label>Confirmed</label><select id="fltConfirmed"><option value="">Any</option><option value="1">Yes</option><option value="0">No</option></select></div>
    <div class="field"><label>Min group</label><input id="fltMinGroup" type="number" min="1" /></div>
    <div class="field"><label>Page size</label>
      <select id="fltPageSize"><option>10</option><option selected>25</option><option>50</option><option>100</option></select>
    </div>
    <button class="cta" id="btnLoad" style="align-self:flex-end">Load</button>
  </div>
  <div id="subsMeta" class="small text-secondary" style="margin-top:6px"></div>
  <div id="rows" class="table-wrap" style="margin-top:12px"></div>
  <div id="subsPager" style="display:flex;align-items:center;gap:8px;margin-top:10px">
    <button class="cta secondary" id="btnPrev">‹ Prev</button>
    <span id="pageInfo" class="small text-secondary"></span>
    <button class="cta secondary" id="btnNext">Next ›</button>
  </div>
  <div style="margin-top:12px">
    <input id="emailDiscount" placeholder="email for discount" />
    <button class="cta" id="btnDiscount">Issue discount</button>
  </div>
`;
// Keep layout width aligned with the page container
document.querySelector('main')?.appendChild(subsSection);

const subsState = { page: 1, pageSize: 25, sort: 'created_at', dir: 'desc', total: 0, totalPages: 0 };

function formatMonthYear(d){
  try { return new Date(d).toLocaleString(undefined, { month: 'short', year: 'numeric' }); } catch { return ''; }
}

function renderSubsTable(rows){
  const container = document.getElementById('rows');
  const arrows = (key)=> subsState.sort===key ? (subsState.dir==='asc'?' ▲':' ▼') : '';
  container.innerHTML = `<table><thead><tr>
    <th data-sort="email">Email${arrows('email')}</th>
    <th data-sort="created_at">Created${arrows('created_at')}</th>
    <th>Name</th>
    <th data-sort="trip_type">Trip</th>
    <th data-sort="group_size">Group${arrows('group_size')}</th>
    <th>Months</th>
    <th data-sort="stars">Stars${arrows('stars')}</th>
    <th data-sort="confirmed">Confirmed${arrows('confirmed')}</th>
    <th>Returning</th>
    <th>Discount</th>
    <th>Ref</th>
    <th>ReferredBy</th>
  </tr></thead><tbody></tbody></table>`;
  const tbody = container.querySelector('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const created = r.created_at ? formatMonthYear(r.created_at) : '';
    const name = `${r.first_name||''} ${r.last_name||''}`.trim();
    const dot = r.confirmed ? 'dot-success' : 'dot-warning';
    const initials = (r.first_name||r.email||'?').slice(0,1).toUpperCase();
    tr.innerHTML = `<td><span class="code">${r.email}</span></td>
      <td>${created}</td>
      <td><span class="avatar">${initials}</span>${name||'—'}</td>
      <td>${r.trip_type||''}</td>
      <td>${r.group_size||''}</td>
      <td>${r.travel_months||''}</td>
      <td>${r.stars||0}</td>
      <td><span class="status-dot ${dot}"></span>${r.confirmed?'Confirmed':'Pending'}</td>
      <td>${r.is_returning?'<span class="chip yes">Yes</span>':'<span class="chip no">No</span>'}</td>
      <td>${r.discount_code||''}</td>
      <td>${r.ref_code||''}</td>
      <td>${r.referred_by||''}</td>`;
    tbody.appendChild(tr);
  });
  // Sort header clicks
  container.querySelectorAll('th[data-sort]').forEach(th=>{
    th.style.cursor = 'pointer';
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-sort');
      if (subsState.sort === key) subsState.dir = subsState.dir === 'asc' ? 'desc' : 'asc';
      else { subsState.sort = key; subsState.dir = 'asc'; }
      subsState.page = 1;
      loadSubs();
    });
  });
}

async function loadSubs() {
  const params = new URLSearchParams();
  const trip = document.getElementById('fltTrip').value; if (trip) params.set('tripType', trip);
  const q = document.getElementById('fltQ').value.trim(); if (q) params.set('q', q);
  const conf = document.getElementById('fltConfirmed').value; if (conf !== '') params.set('confirmed', conf);
  const mg = document.getElementById('fltMinGroup').value; if (mg) params.set('minGroupSize', mg);
  params.set('page', String(subsState.page));
  params.set('pageSize', String(subsState.pageSize));
  params.set('sort', subsState.sort);
  params.set('dir', subsState.dir);
  const res = await fetch('/api/subscribers?' + params.toString(), { credentials: 'include' });
  const data = await res.json();
  const meta = document.getElementById('subsMeta');
  const pageInfo = document.getElementById('pageInfo');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (!data.ok) { document.getElementById('rows').textContent = data.error || 'Failed'; return; }
  subsState.total = data.total; subsState.totalPages = data.totalPages; subsState.page = data.page; subsState.pageSize = data.pageSize;
  renderSubsTable(data.rows);
  meta.textContent = `${data.total} total · Sorted by ${subsState.sort} ${subsState.dir}`;
  pageInfo.textContent = `Page ${subsState.page} of ${subsState.totalPages||1}`;
  btnPrev.disabled = subsState.page <= 1;
  btnNext.disabled = subsState.page >= (subsState.totalPages||1);
}

document.getElementById('btnLoad').addEventListener('click', ()=>{ subsState.page = 1; loadSubs(); });
document.getElementById('fltTrip').addEventListener('change', ()=>{ subsState.page = 1; loadSubs(); });
document.getElementById('fltConfirmed').addEventListener('change', ()=>{ subsState.page = 1; loadSubs(); });
document.getElementById('fltMinGroup').addEventListener('input', ()=>{ subsState.page = 1; });
document.getElementById('fltQ').addEventListener('input', ()=>{ subsState.page = 1; });
document.getElementById('fltPageSize').addEventListener('change', (e)=>{ subsState.pageSize = Number(e.target.value)||25; subsState.page = 1; loadSubs(); });
document.getElementById('btnPrev').addEventListener('click', ()=>{ if (subsState.page>1){ subsState.page -= 1; loadSubs(); }});
document.getElementById('btnNext').addEventListener('click', ()=>{ if (subsState.page < subsState.totalPages){ subsState.page += 1; loadSubs(); }});

document.getElementById('btnDiscount').addEventListener('click', async () => {
  const email = document.getElementById('emailDiscount').value.trim();
  const res = await fetch('/api/discount', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }), credentials: 'include' });
  const data = await res.json();
  if (data.ok) out.textContent = `Issued code ${data.discountCode} to ${data.email}`;
  else out.textContent = data.error || 'Failed to issue code';
});

// Load stats for dashboard cards and bars
async function loadStats() {
  const res = await fetch('/api/admin-stats', { credentials: 'include' });
  const data = await res.json();
  if (!data.ok) return;
  document.getElementById('statTotal').textContent = data.totals.total;
  document.getElementById('statConfirmed').textContent = data.totals.confirmed;
  document.getElementById('statStars').textContent = data.totals.totalStars;
  document.getElementById('statReferred').textContent = data.totals.referred;
  const bars = document.getElementById('tripBars');
  bars.innerHTML = '';
  const max = Math.max(1, ...data.byTrip.map(x=>x.count));
  data.byTrip.forEach(x => {
    const col = document.createElement('div');
    col.style.height = (x.count/max*100)+'%';
    col.style.width = '36px';
    col.style.background = 'linear-gradient(180deg, var(--primary), #8ab4ff)';
    col.style.borderRadius = '8px 8px 0 0';
    col.title = `${x.key}: ${x.count}`;
    bars.appendChild(col);
  });

  // Country distribution (from subscribers endpoint quick sample)
  try{
    const r2 = await fetch('/api/subscribers?page=1&pageSize=500&sort=created_at&dir=desc', { credentials:'include' });
    const j2 = await r2.json();
    if (j2.ok){
      const counts = {};
      (j2.rows||[]).forEach(s=>{ const k = (s.country_code||'').toUpperCase()||'UNK'; counts[k] = (counts[k]||0)+1; });
      const arr = Object.entries(counts).filter(([k])=>k!=='UNK').sort((a,b)=>b[1]-a[1]).slice(0,6);
      const max = Math.max(1, ...arr.map(([,c])=>c));
      const wrap = document.getElementById('countryBars');
      wrap.innerHTML = '';
      arr.forEach(([cc,count])=>{
        const row = document.createElement('div'); row.style.margin='10px 0';
        const label = document.createElement('div'); label.textContent = cc; label.style.fontWeight='600';
        const bar = document.createElement('div'); bar.style.height='8px'; bar.style.borderRadius='999px'; bar.style.background='rgba(255,255,255,.08)';
        const fill = document.createElement('div'); fill.style.height='100%'; fill.style.width=(count/max*100)+'%'; fill.style.borderRadius='999px'; fill.style.background='linear-gradient(90deg, var(--primary), #8ab4ff)';
        bar.appendChild(fill);
        const meta = document.createElement('div'); meta.className='small text-secondary'; meta.textContent = count + ' subscribers';
        row.appendChild(label); row.appendChild(bar); row.appendChild(meta); wrap.appendChild(row);
      });
    }
  }catch{}

  // Signups chart (SVG area)
  try{
    const r = await fetch('/api/admin/signups-by-day?days=30', { credentials: 'include' });
    const j = await r.json(); if (!j.ok) return;
    const points = j.rows || [];
    const svg = document.getElementById('signupsChart');
    const w = 600, h = 140, pl = 6, pr = 6, pt = 6, pb = 18;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    if (!points.length){ svg.innerHTML = ''; return; }
    const xs = points.map(p=>p._id); const ys = points.map(p=>p.count);
    const maxY = Math.max(1, ...ys);
    const stepX = (w - pl - pr) / Math.max(1, xs.length - 1);
    const toX = (i)=> pl + i*stepX;
    const toY = (v)=> pt + (h - pt - pb) * (1 - v/maxY);
    let d = '';
    points.forEach((p,i)=>{ const x = toX(i), y = toY(p.count); d += (i? ' L':'M')+x+','+y; });
    const area = d + ` L ${toX(points.length-1)},${h-pb} L ${toX(0)},${h-pb} Z`;
    svg.innerHTML = `
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.06"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#g)" stroke="none"/>
      <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
    `;
  }catch{}
}

// Auto-load stats and subscribers shortly after page load
setTimeout(()=>{ loadStats(); loadSubs(); loadPromotions(); }, 300);

// Ensure authenticated, otherwise bounce to login
(async ()=>{
  try{
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const j = await r.json();
    if (!j.ok) location.href = '/login.html';
  }catch{ location.href = '/login.html'; }
})();

// Logout
document.getElementById('logout').addEventListener('click', async ()=>{
  await fetch('/api/auth/logout', { method:'POST', credentials: 'include' });
  location.href = '/login.html';
});

// Promotions
async function loadPromotions(){
  const res = await fetch('/api/promotions', { credentials: 'include' });
  const data = await res.json();
  const div = document.getElementById('promoRows');
  if (!data.ok) { div.textContent = data.error || 'Failed'; return; }
  div.innerHTML = '';
  data.rows.forEach(p => {
    const row = document.createElement('div');
    row.className = 'card';
    const start = p.start_date ? new Date(p.start_date).toISOString().slice(0,10) : '';
    const end = p.end_date ? new Date(p.end_date).toISOString().slice(0,10) : '';
    const draw = p.draw_date ? new Date(p.draw_date).toISOString().slice(0,10) : '';
    row.innerHTML = `<div class="card-body" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <strong style="min-width:180px">${p.title}</strong>
      <span>Code: ${p.code||'-'}</span>
      <span>Start: ${start||'-'}</span>
      <span>End: ${end||'-'}</span>
      <span>Draw: ${draw||'-'}</span>
      <label style="margin-left:auto"><input type="checkbox" data-id="${p._id}" class="promo-active" ${p.active?'checked':''}/> Active</label>
      <button class="cta secondary promo-edit" data-id="${p._id}">Edit</button>
      <button class="cta secondary promo-del" data-id="${p._id}">Delete</button>
    </div>`;
    div.appendChild(row);
  });

  // Bind toggles and actions
  div.querySelectorAll('.promo-active').forEach(el=>{
    el.addEventListener('change', async ()=>{
      const id = el.getAttribute('data-id');
      await fetch('/api/promotions/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: el.checked }), credentials:'include' });
    });
  });
  div.querySelectorAll('.promo-del').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = el.getAttribute('data-id');
      await fetch('/api/promotions/'+id, { method:'DELETE', credentials:'include' });
      loadPromotions();
    });
  });
  div.querySelectorAll('.promo-edit').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = el.getAttribute('data-id');
      const title = prompt('Title');
      const code = prompt('Code');
      const start = prompt('Start (YYYY-MM-DD)');
      const end = prompt('End (YYYY-MM-DD)');
      const draw = prompt('Draw (YYYY-MM-DD)');
      const notes = prompt('Notes');
      await fetch('/api/promotions/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, code, start_date: start||null, end_date: end||null, draw_date: draw||null, notes }), credentials:'include' });
      loadPromotions();
    });
  });
}

document.getElementById('promoForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const title = document.getElementById('promoTitle').value.trim();
  const code = document.getElementById('promoCode').value.trim();
  const start = document.getElementById('promoStart').value;
  const end = document.getElementById('promoEnd').value;
  const draw = document.getElementById('promoDraw').value;
  const notes = document.getElementById('promoNotes').value.trim();
  const active = document.getElementById('promoActive').checked;
  const outMsg = document.getElementById('promoMsg');
  outMsg.textContent = 'Saving...';
  const res = await fetch('/api/promotions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, code, start_date: start||null, end_date: end||null, draw_date: draw||null, notes, active }), credentials:'include' });
  const data = await res.json();
  if (!data.ok) { outMsg.textContent = data.error || 'Failed'; return; }
  outMsg.textContent = 'Saved.';
  (e.target).reset();
  loadPromotions();
});

