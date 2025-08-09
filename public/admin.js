const form = document.getElementById('broadcastForm');
const out = document.getElementById('adminMessage');
form?.addEventListener('submit', async (e) => {
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
      toast(`Broadcast queued for ${data.count} recipients.`);
      closeModals();
    } else {
      out.textContent = data.error || 'Failed to send.';
      toast(data.error||'Failed to send.', true);
    }
  } catch (err) {
    out.textContent = 'Network error.';
    toast('Network error', true);
  }
});

// Export entrants (CSV)
// Header actions
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export CSV';
exportBtn.className = 'cta secondary';
document.getElementById('adminActions').appendChild(exportBtn);
exportBtn.addEventListener('click', async () => {
  const res = await fetch('/api/export', { credentials: 'include' });
  if (!res.ok) { toast('Export failed.', true); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'entrants.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Export started.');
});

// Pick winner
const pickBtn = document.createElement('button');
pickBtn.textContent = 'Pick Winner';
pickBtn.className = 'cta';
document.getElementById('adminActions').appendChild(pickBtn);
pickBtn.addEventListener('click', async () => {
  const res = await fetch('/api/pick-winner', { method: 'POST', credentials: 'include' });
  const data = await res.json();
  if (data.ok) toast(`Winner: ${data.winnerEmail} (from ${data.totalEntrants} confirmed entrants)`);
  else toast(data.error || 'Failed to pick winner.', true);
});

// Admin table to browse subscribers (modern table w/ sorting + pagination)
const subsSection = document.createElement('section');
subsSection.id = 'subscribers';
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
// Insert into admin content area
document.querySelector('.content')?.appendChild(subsSection);

const subsState = { page: 1, pageSize: 25, sort: 'created_at', dir: 'desc', total: 0, totalPages: 0 };

function formatMonthYear(d){
  try { return new Date(d).toLocaleString(undefined, { month: 'short', year: 'numeric' }); } catch { return ''; }
}

function renderSubsTable(rows){
  const container = document.getElementById('rows');
  const arrows = (key)=> subsState.sort===key ? (subsState.dir==='asc'?' ▲':' ▼') : '';
  container.innerHTML = `<table><thead><tr>
    <th style="width:28px"><input type="checkbox" id="chkAll"/></th>
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
    <th style="width:120px">Actions</th>
  </tr></thead><tbody></tbody></table>`;
  const prefs = JSON.parse(localStorage.getItem('colVis')||'{}');
  const show = (key)=> prefs[key]!==false;
  const tbody = container.querySelector('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const created = r.created_at ? formatMonthYear(r.created_at) : '';
    const name = `${r.first_name||''} ${r.last_name||''}`.trim();
    const dot = r.confirmed ? 'dot-success' : 'dot-warning';
    const initials = (r.first_name||r.email||'?').slice(0,1).toUpperCase();
    tr.innerHTML = `<td><input type="checkbox" class="chkRow" data-id="${r._id}"/></td>
      ${show('email')?`<td><span class="code">${r.email}</span></td>`:''}
      ${show('created_at')?`<td>${created}</td>`:''}
      ${show('name')?`<td><span class="avatar">${initials}</span>${name||'—'}</td>`:''}
      ${show('trip_type')?`<td>${r.trip_type||''}</td>`:''}
      ${show('group_size')?`<td>${r.group_size||''}</td>`:''}
      ${show('travel_months')?`<td>${r.travel_months||''}</td>`:''}
      ${show('stars')?`<td>${r.stars||0}</td>`:''}
      ${show('confirmed')?`<td><span class="status-dot ${dot}"></span>${r.confirmed?'Confirmed':'Pending'}</td>`:''}
      ${show('is_returning')?`<td>${r.is_returning?'<span class="chip yes">Yes</span>':'<span class="chip no">No</span>'}</td>`:''}
      ${show('discount_code')?`<td>${r.discount_code||''}</td>`:''}
      ${show('ref_code')?`<td>${r.ref_code||''}</td>`:''}
      ${show('referred_by')?`<td>${r.referred_by||''}</td>`:''}
      <td>
        <button class="cta secondary btnRowEdit" data-id="${r._id}">Edit</button>
        <button class="cta danger btnRowDelete" data-id="${r._id}" style="margin-left:6px">Delete</button>
      </td>`;
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
  // Select all
  const chkAll = container.querySelector('#chkAll');
  chkAll?.addEventListener('change', ()=>{
    container.querySelectorAll('.chkRow').forEach(c=>{ c.checked = chkAll.checked; });
    updateSelectionBar();
  });
  // Row actions
  container.querySelectorAll('.btnRowDelete').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-id');
      const ok = await confirmModal('Delete this subscriber?');
      if (!ok) return;
      await fetch('/api/subscribers/'+id, { method:'DELETE', credentials:'include' });
      toast('Subscriber deleted.');
      loadSubs();
    });
  });
  container.querySelectorAll('.btnRowEdit').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-id');
      openDetailsDrawer(id);
    });
  });
  container.querySelectorAll('.chkRow').forEach(chk=>{
    chk.addEventListener('change', updateSelectionBar);
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
  lastSubsRows = data.rows;
  renderSubsTable(lastSubsRows);
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

// Bulk toolbar actions
document.getElementById('btnDeleteSelected')?.addEventListener('click', async ()=>{
  const ids = Array.from(document.querySelectorAll('.chkRow:checked')).map(x=>x.getAttribute('data-id'));
  if (!ids.length) { toast('No rows selected', true); return; }
  const ok = await confirmModal(`Delete ${ids.length} selected?`);
  if (!ok) return;
  const res = await fetch('/api/subscribers/bulk-delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids }), credentials:'include' });
  const j = await res.json();
  if (!j.ok) { toast(j.error||'Failed to delete', true); return; }
  toast(`Deleted ${j.deleted} subscribers.`);
  loadSubs();
});

document.getElementById('btnEditSelected')?.addEventListener('click', async ()=>{
  const ids = Array.from(document.querySelectorAll('.chkRow:checked')).map(x=>x.getAttribute('data-id'));
  if (!ids.length) { toast('No rows selected', true); return; }
  subsEditOpen(ids);
});

document.getElementById('btnDiscount').addEventListener('click', async () => {
  const email = document.getElementById('emailDiscount').value.trim();
  const res = await fetch('/api/discount', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }), credentials: 'include' });
  const data = await res.json();
  if (data.ok) toast(`Issued code ${data.discountCode} to ${data.email}`);
  else toast(data.error || 'Failed to issue code', true);
});

// Subs edit modal logic
function subsEditOpen(ids){
  const m = document.getElementById('subsEditModal');
  document.getElementById('subsEditCount').textContent = `${ids.length} selected`;
  m.dataset.ids = JSON.stringify(ids);
  document.getElementById('subsEditConfirmed').value = '';
  document.getElementById('subsEditStars').value = '';
  document.getElementById('subsEditDiscount').value = '';
  m.classList.remove('hidden');
}

document.getElementById('subsEditForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const m = document.getElementById('subsEditModal');
  const ids = JSON.parse(m.dataset.ids||'[]');
  const payload = { ids };
  const c = document.getElementById('subsEditConfirmed').value;
  if (c!== '') payload.confirmed = c==='1';
  const s = document.getElementById('subsEditStars').value;
  if (s) payload.stars = Number(s)||0;
  const d = document.getElementById('subsEditDiscount').value.trim();
  if (d) payload.discount_code = d;
  const res = await fetch('/api/subscribers/bulk-update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'include' });
  const j = await res.json();
  if (!j.ok){ toast(j.error||'Failed to update', true); return; }
  toast(`Updated ${j.modified} subscribers.`);
  closeModals();
  loadSubs();
});

function selectedIds(){ return Array.from(document.querySelectorAll('.chkRow:checked')).map(x=>x.getAttribute('data-id')); }
function updateSelectionBar(){
  const ids = selectedIds();
  const bar = document.getElementById('selectionBar'); if (!bar) return;
  const cnt = document.getElementById('selCount');
  cnt.textContent = `${ids.length} selected`;
  bar.style.display = ids.length ? 'block' : 'none';
}
document.getElementById('selDelete')?.addEventListener('click', async ()=>{
  const ids = selectedIds(); if (!ids.length) return;
  const ok = await confirmModal(`Delete ${ids.length} selected?`); if (!ok) return;
  const res = await fetch('/api/subscribers/bulk-delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids }), credentials:'include' });
  const j = await res.json(); if (!j.ok){ toast(j.error||'Failed', true); return; }
  toast(`Deleted ${j.deleted} subscribers.`); loadSubs();
});
document.getElementById('selEdit')?.addEventListener('click', ()=>{
  const ids = selectedIds(); if (!ids.length) return; subsEditOpen(ids);
});

// Details drawer
async function openDetailsDrawer(id){
  const m = document.getElementById('detailsDrawer');
  const body = document.getElementById('detailsBody');
  m.classList.remove('hidden');
  body.textContent = 'Loading…';
  const r = await fetch('/api/subscribers/'+id, { credentials:'include' });
  const j = await r.json(); if (!j.ok){ body.textContent = j.error||'Failed'; return; }
  const s = j.row;
  body.innerHTML = `
    <div class="field"><label>Email</label><div class="code">${s.email}</div></div>
    <div class="field"><label>Name</label><input id="detFirst" value="${s.first_name||''}" placeholder="First"/> <input id="detLast" value="${s.last_name||''}" placeholder="Last"/></div>
    <div class="field"><label>Trip type</label><input id="detTrip" value="${s.trip_type||''}"/></div>
    <div class="field"><label>Group size</label><input id="detGroup" type="number" value="${s.group_size||''}"/></div>
    <div class="field"><label>Travel months</label><input id="detMonths" value="${s.travel_months||''}"/></div>
    <div class="field"><label>Stars</label><input id="detStars" type="number" value="${s.stars||0}"/></div>
    <div class="field"><label>Confirmed</label><select id="detConfirmed"><option value="1" ${s.confirmed?'selected':''}>Yes</option><option value="0" ${!s.confirmed?'selected':''}>No</option></select></div>
    <div class="field"><label>Returning</label><select id="detReturning"><option value="" ${!s.is_returning?'selected':''}>No</option><option value="1" ${s.is_returning?'selected':''}>Yes</option></select></div>
    <div class="field"><label>Discount</label><input id="detDiscount" value="${s.discount_code||''}"/></div>
    <div style="display:flex; gap:8px; margin-top:10px"><button id="detSave" class="cta">Save</button><button id="detClose" class="cta secondary">Close</button></div>
  `;
  document.getElementById('detClose').addEventListener('click', closeModals);
  document.getElementById('detSave').addEventListener('click', async ()=>{
    const payload = {
      first_name: document.getElementById('detFirst').value.trim(),
      last_name: document.getElementById('detLast').value.trim(),
      trip_type: document.getElementById('detTrip').value.trim(),
      group_size: Number(document.getElementById('detGroup').value)||null,
      travel_months: document.getElementById('detMonths').value.trim(),
      stars: Number(document.getElementById('detStars').value)||0,
      confirmed: document.getElementById('detConfirmed').value==='1',
      is_returning: document.getElementById('detReturning').value==='1',
      discount_code: document.getElementById('detDiscount').value.trim()
    };
    const r2 = await fetch('/api/subscribers/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'include' });
    const j2 = await r2.json(); if (!j2.ok){ toast(j2.error||'Failed', true); return; }
    toast('Saved.'); closeModals(); loadSubs();
  });
}

// Toast helper
function toast(message, isError=false){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.style.borderColor = isError ? 'rgba(255,77,79,.6)' : 'rgba(255,255,255,.12)';
  el.style.boxShadow = isError ? '0 10px 30px rgba(255,77,79,.25)' : '0 10px 30px rgba(0,0,0,.4)';
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(()=>{ el.classList.add('hidden'); }, 2600);
}

// Load stats for dashboard cards and bars
async function loadStats() {
  const res = await fetch('/api/admin-stats', { credentials: 'include' });
  const data = await res.json();
  if (!data.ok) return;
  document.getElementById('statTotal').textContent = data.totals.total.toLocaleString();
  document.getElementById('statConfirmed').textContent = data.totals.confirmed.toLocaleString();
  document.getElementById('statStars').textContent = data.totals.totalStars.toLocaleString();
  document.getElementById('statReferred').textContent = data.totals.referred.toLocaleString();
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
        const bar = document.createElement('div'); bar.style.height='8px'; bar.style.borderRadius='999px'; bar.style.background='rgba(255,255,255,.08)'; bar.style.overflow='hidden';
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
setTimeout(()=>{ loadStats(); loadSubs(); loadPromotions(); initDraw(); initBroadcastModal(); initQuickFilters(); initColVisibility(); }, 300);

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

// Modal helpers
function closeModals(){ document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); }
document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click', closeModals));
document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeModals(); });

function promoEditOpen(p){
  const m = document.getElementById('promoEditModal');
  document.getElementById('promoEditId').value = p.id;
  document.getElementById('promoEditTitleInput').value = p.title||'';
  document.getElementById('promoEditCodeInput').value = p.code||'';
  document.getElementById('promoEditStartInput').value = p.start_date||'';
  document.getElementById('promoEditEndInput').value = p.end_date||'';
  document.getElementById('promoEditDrawInput').value = p.draw_date||'';
  document.getElementById('promoEditNotesInput').value = p.notes||'';
  document.getElementById('promoEditActiveInput').checked = !!p.active;
  m.classList.remove('hidden');
}

async function confirmModal(message){
  return new Promise(resolve=>{
    const m = document.getElementById('confirmModal');
    document.getElementById('confirmMessage').textContent = message||'Are you sure?';
    m.classList.remove('hidden');
    const yes = document.getElementById('confirmYes');
    const onYes = ()=>{ m.classList.add('hidden'); yes.removeEventListener('click', onYes); resolve(true); };
    yes.addEventListener('click', onYes);
    m.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click', ()=>resolve(false), { once:true }));
  });
}

document.getElementById('promoEditForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = document.getElementById('promoEditId').value;
  const title = document.getElementById('promoEditTitleInput').value.trim();
  const code = document.getElementById('promoEditCodeInput').value.trim();
  const start = document.getElementById('promoEditStartInput').value;
  const end = document.getElementById('promoEditEndInput').value;
  const draw = document.getElementById('promoEditDrawInput').value;
  const notes = document.getElementById('promoEditNotesInput').value.trim();
  const active = document.getElementById('promoEditActiveInput').checked;
  const res = await fetch('/api/promotions/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, code, start_date: start||null, end_date: end||null, draw_date: draw||null, notes, active }), credentials:'include' });
  const j = await res.json();
  if (!j.ok){ toast(j.error||'Failed to update', true); return; }
  toast('Promotion updated.');
  closeModals();
  loadPromotions();
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
      const ok = await confirmModal('Delete this promotion?');
      if (!ok) return;
      await fetch('/api/promotions/'+id, { method:'DELETE', credentials:'include' });
      toast('Promotion deleted.');
      loadPromotions();
    });
  });
  div.querySelectorAll('.promo-edit').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = el.getAttribute('data-id');
      // Load current row to prefill
      const res = await fetch('/api/promotions', { credentials:'include' });
      const j = await res.json();
      const row = (j.rows||[]).find(r=>String(r._id)===String(id));
      promoEditOpen({
        id,
        title: row?.title||'',
        code: row?.code||'',
        start_date: row?.start_date? new Date(row.start_date).toISOString().slice(0,10):'',
        end_date: row?.end_date? new Date(row.end_date).toISOString().slice(0,10):'',
        draw_date: row?.draw_date? new Date(row.draw_date).toISOString().slice(0,10):'',
        notes: row?.notes||'',
        active: !!row?.active
      });
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

// Draw panel
function gatherDrawCriteria(){
  const confirmedVal = document.getElementById('drawConfirmed').value;
  return {
    confirmed: confirmedVal===''?undefined:(confirmedVal==='1'),
    minStars: Number(document.getElementById('drawMinStars').value)||0,
    returning: document.getElementById('drawReturning').value==='1',
    countryCode: document.getElementById('drawCountry').value.trim()||undefined,
    startDate: document.getElementById('drawFrom').value||undefined,
    endDate: document.getElementById('drawTo').value||undefined,
  };
}

async function refreshDrawPreview(){
  const crit = gatherDrawCriteria();
  try{
    const r = await fetch('/api/draw/simulate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(crit), credentials:'include' });
    const j = await r.json();
    if (!j.ok) { document.getElementById('drawPreview').textContent = j.error||'Failed'; return; }
    document.getElementById('drawPreview').textContent = `${j.eligible_count} eligible`; 
  }catch{ document.getElementById('drawPreview').textContent = 'Failed'; }
}

async function refreshDrawHistory(){
  try{
    const r = await fetch('/api/draw/history', { credentials:'include' });
    const j = await r.json(); if (!j.ok) return;
    const wrap = document.getElementById('drawHistory');
    wrap.innerHTML = '<div class="small text-secondary" style="margin-bottom:6px">Recent winners</div>' +
      (j.rows||[]).map(x=>`<div class="card" style="margin:6px 0"><div class="card-body">${new Date(x.created_at).toLocaleString()} — ${String(x.winner_email||'').replace(/^(..).*@/, '$1***@')}</div></div>`).join('');
  }catch{}
}

function initDraw(){
  ['drawConfirmed','drawMinStars','drawReturning','drawCountry','drawFrom','drawTo'].forEach(id=>{
    const el = document.getElementById(id); el?.addEventListener('change', refreshDrawPreview);
    el?.addEventListener('input', refreshDrawPreview);
  });
  document.getElementById('btnSimulate')?.addEventListener('click', refreshDrawPreview);
  document.getElementById('btnPickWinner')?.addEventListener('click', async ()=>{
    const crit = gatherDrawCriteria();
    const r = await fetch('/api/draw', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(crit), credentials:'include' });
    const j = await r.json();
    if (!j.ok) { toast(j.error||'Failed to pick', true); return; }
    toast(`Winner: ${j.winnerEmail}`);
    refreshDrawHistory();
  });
  document.getElementById('btnExportEligible')?.addEventListener('click', (e)=>{
    e.preventDefault();
    const c = gatherDrawCriteria();
    const params = new URLSearchParams();
    if (c.confirmed!==undefined) params.set('confirmed', c.confirmed?'1':'0');
    if (c.minStars) params.set('minStars', String(c.minStars));
    if (c.returning) params.set('returning','1');
    if (c.countryCode) params.set('countryCode', c.countryCode);
    if (c.startDate) params.set('startDate', c.startDate);
    if (c.endDate) params.set('endDate', c.endDate);
    window.location.href = '/api/draw/export?'+params.toString();
  });
  refreshDrawPreview();
  refreshDrawHistory();
}

// Broadcast modal
function initBroadcastModal(){
  document.getElementById('openBroadcast')?.addEventListener('click', ()=>{
    document.getElementById('broadcastModal').classList.remove('hidden');
  });
  // templates
  document.querySelectorAll('#broadcastModal [data-tpl]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tpl = btn.getAttribute('data-tpl');
      const subj = document.getElementById('subject');
      const msg = document.getElementById('message');
      if (tpl==='winner'){ subj.value = 'We have a winner!'; msg.value = 'Congrats to our contest winner! Stay tuned for future promos.'; }
      if (tpl==='confirm'){ subj.value = 'Confirm your entry'; msg.value = 'Please confirm your entry to be eligible for the draw.'; }
      if (tpl==='promo'){ subj.value = 'Promotion update'; msg.value = 'New perks just added to our promotion.'; }
    });
  });
}

// Quick filters
function initQuickFilters(){
  document.querySelectorAll('#quickFilters [data-qf]')?.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const v = btn.getAttribute('data-qf');
      if (v===''){ document.getElementById('fltConfirmed').value = ''; document.getElementById('fltQ').value=''; }
      if (v==='confirmed:1') document.getElementById('fltConfirmed').value = '1';
      if (v==='confirmed:0') document.getElementById('fltConfirmed').value = '0';
      if (v==='returning:1') document.getElementById('fltQ').value = ''; // not in filter API; narrow via server later if needed
      if (v==='discount:1') document.getElementById('fltQ').value = ''; // placeholder
      subsState.page = 1; loadSubs();
    });
  });
}

// Column visibility
const colDefs = [
  { key:'email', label:'Email' },
  { key:'created_at', label:'Created' },
  { key:'name', label:'Name' },
  { key:'trip_type', label:'Trip' },
  { key:'group_size', label:'Group' },
  { key:'travel_months', label:'Months' },
  { key:'stars', label:'Stars' },
  { key:'confirmed', label:'Confirmed' },
  { key:'is_returning', label:'Returning' },
  { key:'discount_code', label:'Discount' },
  { key:'ref_code', label:'Ref' },
  { key:'referred_by', label:'ReferredBy' }
];

function initColVisibility(){
  const wrap = document.getElementById('colVis'); if (!wrap) return;
  const prefs = JSON.parse(localStorage.getItem('colVis')||'{}');
  wrap.innerHTML = '';
  colDefs.forEach((c,i)=>{
    const chip = document.createElement('span'); chip.className='chip'+((prefs[c.key]??true)?' active':''); chip.textContent=c.label;
    chip.addEventListener('click', ()=>{
      const cur = chip.classList.toggle('active');
      prefs[c.key] = cur; localStorage.setItem('colVis', JSON.stringify(prefs));
      renderSubsTable(lastSubsRows||[]);
    });
    wrap.appendChild(chip);
  });
}

let lastSubsRows = [];

