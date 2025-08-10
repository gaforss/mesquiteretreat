// Export entrants (CSV)
// Disable ApexCharts animations globally for performance
try{
  window.Apex = window.Apex || {};
  window.Apex.chart = Object.assign({}, window.Apex.chart||{}, { animations: { enabled: false } });
}catch{}
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

// Admin table (uses static markup in admin.html)

const subsState = {
  page: 1,
  pageSize: 25,
  sort: 'created_at',
  dir: 'desc',
  total: 0,
  totalPages: 0,
  filters: { tripType: '', q: '', confirmed: '', minGroupSize: '' }
};

function formatMonthYear(d){
  try { return new Date(d).toLocaleString(undefined, { month: 'short', year: 'numeric' }); } catch { return ''; }
}

function renderSubsTable(rows){
  const container = document.getElementById('rows');
  const arrows = (key)=> subsState.sort===key ? (subsState.dir==='asc'?' ▲':' ▼') : '';
  container.innerHTML = `<table role="grid"><thead><tr>
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
  const { tripType, q, confirmed, minGroupSize } = subsState.filters || {};
  if (tripType) params.set('tripType', tripType);
  if (q) params.set('q', q);
  if (confirmed !== undefined && confirmed !== '') params.set('confirmed', confirmed);
  if (minGroupSize) params.set('minGroupSize', String(minGroupSize));
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
  if (meta) meta.textContent = `${data.total} total · Sorted by ${subsState.sort} ${subsState.dir}`;
  pageInfo.textContent = `Page ${subsState.page} of ${subsState.totalPages||1}`;
  btnPrev.disabled = subsState.page <= 1;
  btnNext.disabled = subsState.page >= (subsState.totalPages||1);
}

document.getElementById('btnPrev')?.addEventListener('click', ()=>{ if (subsState.page>1){ subsState.page -= 1; loadSubs(); }});
document.getElementById('btnNext')?.addEventListener('click', ()=>{ if (subsState.page < subsState.totalPages){ subsState.page += 1; loadSubs(); }});

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

document.getElementById('btnDiscount')?.addEventListener('click', async () => {
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
  
  // Reset all form fields
  document.getElementById('subsEditConfirmed').value = '';
  document.getElementById('subsEditStars').value = '';
  document.getElementById('subsEditDiscount').value = '';
  document.getElementById('subsEditReturning').value = '';
  
  m.classList.remove('hidden');
}

document.getElementById('subsEditForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const m = document.getElementById('subsEditModal');
  const ids = JSON.parse(m.dataset.ids||'[]');
  const payload = { ids };
  
  // Get form values
  const c = document.getElementById('subsEditConfirmed').value;
  if (c !== '') payload.confirmed = c === '1';
  
  const s = document.getElementById('subsEditStars').value;
  if (s) payload.stars = Number(s) || 0;
  
  const d = document.getElementById('subsEditDiscount').value.trim();
  if (d) payload.discount_code = d;
  
  const r = document.getElementById('subsEditReturning').value;
  if (r !== '') payload.is_returning = r === '1';
  

  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Updating...';
  submitBtn.disabled = true;
  
  try {
    const res = await fetch('/api/subscribers/bulk-update', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(payload), 
      credentials: 'include' 
    });
    const j = await res.json();
    
    if (!j.ok) {
      toast(j.error || 'Failed to update', true);
      return;
    }
    
    toast(`✅ Updated ${j.modified} subscribers successfully!`);
    closeModals();
    loadSubs();
    
  } catch (error) {
    toast('❌ Network error. Please try again.', true);
  } finally {
    // Reset button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
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
  
  console.log('Admin stats data received:', data);
  console.log('subscriberGrowth data details:', {
    length: data.subscriberGrowth?.length,
    items: data.subscriberGrowth?.map(item => ({ date: item._id, count: item.count }))
  });
  

  
  // Ensure totals object exists and has default values
  const totals = data.totals || { total: 0, confirmed: 0, totalStars: 0, referred: 0 };
  
  document.getElementById('statTotal').textContent = totals.total.toLocaleString();
  document.getElementById('statConfirmed').textContent = totals.confirmed.toLocaleString();
  document.getElementById('statStars').textContent = totals.totalStars.toLocaleString();
  document.getElementById('statReferred').textContent = totals.referred.toLocaleString();
  // Sparkline for Total
  try{
    const elSpark = document.getElementById('sparkTotal');
    if (window.ApexCharts && elSpark){
      if (elSpark.__chart__) elSpark.__chart__.destroy();
      // Build 14-day trend from signups endpoint
      const d = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Placeholder data
      elSpark.__chart__ = new ApexCharts(elSpark, {
        chart: { 
          type: 'line', 
          height: 36, 
          sparkline: { enabled: true },
          animations: { enabled: false },
          dropShadow: { enabled: true, top: 1, left: 0, blur: 4, color: '#fbbf24', opacity: 0.3 }
        },
        stroke: { width: 2.5, curve: 'smooth', lineCap: 'round' },
        colors: ['#fbbf24'],
        tooltip: { enabled: false },
        series: [{ data: d }],
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            opacityFrom: 0.4,
            opacityTo: 0.05,
            stops: [0, 100]
          }
        }
      });
      elSpark.__chart__.render();
    }
  }catch{}
  // Enhanced modern chart styling inspired by financial dashboard
  const baseGrid = { 
    show: false,
    borderColor: 'transparent', 
    row: { colors: ['transparent'] },
    column: { colors: ['transparent'] },
    padding: { top: 20, right: 20, bottom: 20, left: 20 }
  };
  const baseAxis = {
    labels: { 
      style: { 
        colors: '#e8eef7', 
        fontSize: '12px', 
        fontWeight: '500',
        fontFamily: 'Inter, system-ui, sans-serif'
      } 
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  };
  const numberLabel = (val)=> {
    try{ 
      const num = Number(val);
      return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(0);
    } catch{ 
      return val; 
    }
  };

  // Subscriber growth over time (line chart)
  try{
    const el = document.getElementById('tripBars');
    if (!el) return; // Element doesn't exist

    if (window.ApexCharts && data.subscriberGrowth && Array.isArray(data.subscriberGrowth) && data.subscriberGrowth.length > 0){
      try {
        const categories = data.subscriberGrowth.map(x => x._id).filter(Boolean);
        const seriesData = data.subscriberGrowth.map(x => x.count).filter(val => typeof val === 'number');
        
        if (categories.length === 0 || seriesData.length === 0) {
          console.warn('Subscriber growth chart data validation failed:', { 
            categories, 
            seriesData, 
            originalData: data.subscriberGrowth,
            categoriesLength: categories.length,
            seriesDataLength: seriesData.length
          });
          throw new Error('Invalid chart data - no valid categories or series data');
        }
        
        if (el.__chart__) el.__chart__.destroy();
        el.__chart__ = new ApexCharts(el, {
          chart: { 
            type: 'line', 
            height: 280, 
            toolbar: { show: false }, 
            foreColor: '#e8eef7',
            background: 'transparent',
            animations: { enabled: false },
            dropShadow: { enabled: true, top: 4, left: 0, blur: 12, color: '#10b981', opacity: 0.15 }
          },
          theme: { 
            mode: 'dark',
            palette: 'palette1'
          },
          grid: baseGrid,
          colors: ['#10b981'],
          stroke: { 
            width: 3, 
            curve: 'smooth',
            lineCap: 'round'
          },
          dataLabels: { enabled: false },
          xaxis: { 
            ...baseAxis, 
            categories,
            type: 'datetime',
            labels: {
              ...baseAxis.labels,
              formatter: function(value) {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
            }
          },
          yaxis: { 
            labels: { 
              formatter: numberLabel, 
              style: { 
                colors: '#9aa4b2',
                fontSize: '11px',
                fontWeight: '600'
              } 
            },
            min: 0,
            tickAmount: 5
          },
          series: [{ name: 'New Subscribers', data: seriesData }],
          fill: { 
            type: 'gradient', 
            gradient: { 
              shade: 'dark', 
              type: 'vertical', 
              opacityFrom: 0.4, 
              opacityTo: 0.05, 
              stops: [0, 100],
              colorStops: [
                { offset: 0, color: '#10b981', opacity: 0.3 },
                { offset: 100, color: '#10b981', opacity: 0.05 }
              ]
            } 
          },
          tooltip: {
            x: {
              formatter: function(value) {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                });
              }
            }
          },
          states: {
            hover: {
              filter: {
                type: 'darken',
                value: 0.1
              }
            }
          }
        });
        el.__chart__.render();
      } catch (chartError) {
        console.error('Error creating subscriber growth chart:', chartError);
        if (el.__chart__) el.__chart__.destroy();
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#5f6b7a;font-size:14px;text-align:center;"><div>📊 Chart error<br><small>Unable to display subscriber growth data</small></div></div>';
      }
    } else if (el && window.ApexCharts) {
      // Show a simple message when no data is available
      if (el.__chart__) el.__chart__.destroy();
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#5f6b7a;font-size:14px;text-align:center;"><div>📈 Subscriber Growth<br><small>No signups in the last 30 days<br>Total subscribers: ' + (totals.total || 0) + '</small></div></div>';
    } else if (el && !window.ApexCharts) {
      // Retry loading charts if ApexCharts isn't available yet
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#5f6b7a;font-size:14px;text-align:center;"><div>📊 Loading charts...<br><small>Waiting for ApexCharts library</small></div></div>';
      // Retry after 1 second
      setTimeout(() => {
        if (window.ApexCharts) {
          loadStats();
        }
      }, 1000);
    } else if (el) {
      // Fallback for when ApexCharts is not available
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#5f6b7a;font-size:14px;text-align:center;"><div>📈 Subscriber Growth<br><small>No signups in the last 30 days</small></div></div>';
    }
  }catch(e){
    console.error('Error rendering subscriber growth chart:', e);
  }

  // Country distribution (horizontal bar)
  try{
    const r2 = await fetch('/api/subscribers?page=1&pageSize=500&sort=created_at&dir=desc', { credentials:'include' });
    
    // Check if response is valid JSON
    const contentType2 = r2.headers.get('content-type');
    if (!contentType2 || !contentType2.includes('application/json')) {
      console.error('Subscribers API returned non-JSON response:', await r2.text());
      return;
    }
    
    const j2 = await r2.json();
    if (j2.ok && window.ApexCharts && j2.rows && Array.isArray(j2.rows)){
      const counts = {};
      (j2.rows||[]).forEach(s=>{ 
        const countryCode = s.country_code || '';
        const k = countryCode ? countryCode.toUpperCase() : 'Unknown';
        counts[k] = (counts[k]||0)+1; 
      });
      const arr = Object.entries(counts).filter(([k])=>k!=='Unknown').sort((a,b)=>b[1]-a[1]).slice(0,6);
      const el = document.getElementById('countryBars');
      if (!el) return; // Element doesn't exist
      
      if (el){
        if (el.__chart__) el.__chart__.destroy();
        el.__chart__ = new ApexCharts(el, {
          chart: { 
            type: 'donut', 
            height: 280, 
            toolbar: { show: false }, 
            foreColor: '#e8eef7',
            background: 'transparent',
            animations: { enabled: false },
            dropShadow: { enabled: true, top: 2, left: 0, blur: 8, color: '#34d399', opacity: 0.2 }
          },
          theme: { 
            mode: 'dark',
            palette: 'palette2'
          },
          colors: ['#34d399', '#60a5fa', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
          plotOptions: { 
            pie: { 
              donut: {
                size: '65%',
                labels: {
                  show: true,
                  name: {
                    show: true,
                    fontSize: '14px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 600,
                    color: '#e8eef7',
                    offsetY: -10
                  },
                  value: {
                    show: true,
                    fontSize: '16px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 600,
                    color: '#34d399',
                    formatter: function (val) {
                      return val
                    }
                  },
                  total: {
                    show: true,
                    label: 'Total',
                    fontSize: '14px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 600,
                    color: '#9aa4b2',
                    formatter: function (w) {
                      return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                    }
                  }
                }
              }
            } 
          },
          dataLabels: { enabled: false },
          legend: {
            position: 'bottom',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            labels: {
              colors: '#9aa4b2'
            }
          },
          series: arr.map(([,c])=>c),
          labels: arr.map(([cc])=>cc),
          states: {
            hover: {
              filter: {
                type: 'darken',
                value: 0.1
              }
            }
          }
        });
        el.__chart__.render();
      } else if (el && window.ApexCharts) {
        // Show empty state when no data
        if (el.__chart__) el.__chart__.destroy();
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#5f6b7a;font-size:14px;">No country data available</div>';
      }
    }
  }catch(e){
    console.error('Error rendering country chart:', e);
  }


}

// Auto-load stats and subscribers shortly after page load
setTimeout(()=>{ 
  loadStats(); 
  loadSubs(); 
  loadPromotions(); 
  initDraw(); 
  initQuickFilters(); 
  initColVisibility(); 
}, 500);

// Wire filter controls from static markup (if present)
(()=>{
  const trip = document.getElementById('fltTrip');
  const q = document.getElementById('fltQ');
  const conf = document.getElementById('fltConfirmed');
  const mg = document.getElementById('fltMinGroup');
  const size = document.getElementById('fltPageSize');
  const loadBtn = document.getElementById('btnLoad');
  if (trip) trip.addEventListener('change', (e)=>{ subsState.filters.tripType = e.target.value; subsState.page = 1; loadSubs(); });
  if (conf) conf.addEventListener('change', (e)=>{ subsState.filters.confirmed = e.target.value; subsState.page = 1; loadSubs(); });
  if (mg) mg.addEventListener('input', (e)=>{ subsState.filters.minGroupSize = e.target.value; subsState.page = 1; });
  if (q) q.addEventListener('input', (e)=>{ subsState.filters.q = e.target.value.trim(); subsState.page = 1; });
  if (size) size.addEventListener('change', (e)=>{ subsState.pageSize = Number(e.target.value)||25; subsState.page = 1; loadSubs(); });
  if (loadBtn) loadBtn.addEventListener('click', ()=>{ subsState.page = 1; loadSubs(); });
})();

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
      <button class="cta secondary promo-make-active" data-id="${p._id}">Set as Active</button>
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
  // Help note for admin
  const help = document.createElement('div');
  help.className = 'small text-secondary';
  help.style.marginTop = '6px';
  help.innerHTML = 'What is a Promotion? It defines a campaign window and optional draw date. The active Promotion powers the public countdown and labels. Entries still go to Subscribers; use the Draw panel to pick a winner. Setting one Promotion active will mark others inactive.';
  div.parentElement?.appendChild(help);

  // Bind Set as Active
  div.querySelectorAll('.promo-make-active').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = el.getAttribute('data-id');
      try{
        const res = await fetch('/api/promotions', { credentials:'include' });
        const j = await res.json();
        const rows = j.rows||[];
        for (const r of rows){
          const desired = String(r._id)===String(id);
          await fetch('/api/promotions/'+r._id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: desired }), credentials:'include' });
        }
        toast('Active promotion set.');
        loadPromotions();
      }catch{ toast('Failed to set active', true); }
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
    countryCode: (function(){
      const sel = document.getElementById('drawCountry');
      const v = (sel?.value||'').trim();
      if (v==='__custom'){ const c = document.getElementById('drawCountryCustom').value.trim().toUpperCase(); return c||undefined; }
      return v||undefined;
    })(),
    startDate: document.getElementById('drawFrom').value||undefined,
    endDate: document.getElementById('drawTo').value||undefined,
    dateMode: (function(){ const m = document.getElementById('drawDateMode'); return m?.value||'created'; })()
  };
}

function updateDrawActiveFilters(){
  const c = gatherDrawCriteria();
  const el = document.getElementById('drawActiveFilters'); if (!el) return;
  const bits = [];
  if (c.confirmed === true) bits.push('Confirmed: Yes');
  else if (c.confirmed === false) bits.push('Confirmed: No');
  if (c.minStars) bits.push(`Min stars: ${c.minStars}`);
  if (c.returning) bits.push('Returning only');
  if (c.countryCode) bits.push(`Country: ${c.countryCode}`);
  const pretty = (iso)=>{
    if (!iso) return '…';
    const [y,m,d] = String(iso).split('-').map(Number);
    const dt = new Date(y||1970, (m||1)-1, d||1);
    try{ return dt.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }); }catch{ return iso; }
  };
  if (c.startDate || c.endDate) bits.push(`Date: ${pretty(c.startDate)} → ${pretty(c.endDate)}`);
  el.textContent = bits.length ? bits.join(' · ') : 'No filters (all time)';
}

async function refreshDrawPreview(){
  const crit = gatherDrawCriteria();
  try{
    const preview = document.getElementById('drawPreview');
    const btn = document.getElementById('btnSimulate');
    console.debug('[Draw] Simulate start', crit);
    // ensure structure exists
    if (preview && (!preview.querySelector('.small') || !preview.querySelector('.count'))){
      preview.innerHTML = '<span class="emoji">🎟️</span><span class="small text-secondary">Eligible</span><strong class="count">—</strong>';
    }
    if (preview){
      const sm = preview.querySelector('.small'); const ct = preview.querySelector('.count');
      if (sm) sm.textContent = 'Loading…'; if (ct) ct.textContent = '—';
      preview.setAttribute('aria-busy','true');
    }
    if (btn) btn.disabled = true;
    const r = await fetch('/api/draw/simulate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(crit), credentials:'include' });
    const j = await r.json();
    console.debug('[Draw] Simulate response', j);
    if (!j.ok){
      if (preview){
        const sm = preview.querySelector('.small'); const ct = preview.querySelector('.count');
        if (sm) sm.textContent = j.error||'Failed'; if (ct) ct.textContent = '—';
        preview.removeAttribute('aria-busy');
      }
      if (btn) btn.disabled = false;
      updateDrawActiveFilters();
      return;
    }
    // Optional: log sample to help admin verify timeframe
    if (Array.isArray(j.sample)){
      console.debug('[Draw] Sample eligible (created_at):', j.sample.map(s=>({ email: s.email, created_at: s.created_at })).slice(0,5));
    }
    if (preview){
      const sm = preview.querySelector('.small'); const ct = preview.querySelector('.count');
      if (sm) sm.textContent = 'Eligible'; if (ct) ct.textContent = String(j.eligible_count);
      preview.removeAttribute('aria-busy');
    }
    if (btn) btn.disabled = false;
    updateDrawActiveFilters();
  }catch(err){
    console.error('[Draw] Simulate error', err);
    const preview = document.getElementById('drawPreview');
    const btn = document.getElementById('btnSimulate');
    if (preview){
      // rebuild if needed
      if (!preview.querySelector('.small') || !preview.querySelector('.count')){
        preview.innerHTML = '<span class="emoji">🎟️</span><span class="small text-secondary">Eligible</span><strong class="count">—</strong>';
      }
      const sm = preview.querySelector('.small'); const ct = preview.querySelector('.count');
      if (sm) sm.textContent = 'Error'; if (ct) ct.textContent = '—';
      preview.removeAttribute('aria-busy');
    }
    if (btn) btn.disabled = false;
    toast('Failed to simulate', true);
    updateDrawActiveFilters();
  }
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
  // Country custom toggle
  const countrySel = document.getElementById('drawCountry');
  const customWrap = document.getElementById('drawCountryCustomWrap');
  countrySel?.addEventListener('change', ()=>{
    const isCustom = countrySel.value==='__custom';
    if (customWrap) customWrap.style.display = isCustom ? 'block' : 'none';
    refreshDrawPreview();
  });
  document.getElementById('drawCountryCustom')?.addEventListener('input', refreshDrawPreview);
  // Segmented controls -> hidden selects
  const confSeg = document.getElementById('drawConfirmedSeg');
  confSeg?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.seg'); if (!btn) return;
    console.debug('[Draw] Confirmed seg click', btn.getAttribute('data-val'));
    confSeg.querySelectorAll('.seg').forEach(b=>b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    confSeg.querySelectorAll('.seg').forEach(b=>b.classList.toggle('active-primary', b===btn));
    const val = btn.getAttribute('data-val')||'';
    const sel = document.getElementById('drawConfirmed'); if (sel) sel.value = val;
    refreshDrawPreview();
  });
  // Ensure initial confirmed state matches UI (Any)
  const confirmedSelect = document.getElementById('drawConfirmed');
  if (confirmedSelect) confirmedSelect.value = '';
  const retSeg = document.getElementById('drawReturningSeg');
  retSeg?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.seg'); if (!btn) return;
    console.debug('[Draw] Returning seg click', btn.getAttribute('data-val'));
    retSeg.querySelectorAll('.seg').forEach(b=>b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    retSeg.querySelectorAll('.seg').forEach(b=>b.classList.toggle('active-primary', b===btn));
    const val = btn.getAttribute('data-val')||'';
    const sel = document.getElementById('drawReturning'); if (sel) sel.value = val;
    refreshDrawPreview();
  });
  // Stars output
  const stars = document.getElementById('drawMinStars');
  const starsOut = document.getElementById('drawMinStarsOut');
  if (stars && starsOut){ starsOut.textContent = String(stars.value||0); stars.addEventListener('input', ()=>{ starsOut.textContent = String(stars.value||0); }); }
  stars?.addEventListener('change', ()=>console.debug('[Draw] Min stars changed', stars.value));
  // Date presets
  const dateSeg = document.getElementById('drawDatePresets');
  // Date mode segmented control
  const dateModeSeg = document.getElementById('drawDateModeSeg');
  dateModeSeg?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.seg'); if (!btn) return;
    const mode = btn.getAttribute('data-mode')||'created';
    console.debug('[Draw] Date mode', mode);
    dateModeSeg.querySelectorAll('.seg').forEach(b=>b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    dateModeSeg.querySelectorAll('.seg').forEach(b=>b.classList.toggle('active-primary', b===btn));
    const sel = document.getElementById('drawDateMode'); if (sel) sel.value = mode;
    refreshDrawPreview();
  });
  dateSeg?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.seg'); if (!btn) return;
    console.debug('[Draw] Date preset', btn.getAttribute('data-range'));
    dateSeg.querySelectorAll('.seg').forEach(b=>b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    dateSeg.querySelectorAll('.seg').forEach(b=>b.classList.toggle('active-primary', b===btn));
    const range = btn.getAttribute('data-range');
    const from = document.getElementById('drawFrom');
    const to = document.getElementById('drawTo');
    const today = new Date();
    const fmt = (d)=>{ const z = d.getTimezoneOffset(); const local = new Date(d.getTime() - z*60000); return local.toISOString().slice(0,10); };
    if (range==='all'){ from.value = ''; to.value = ''; }
    if (range==='30'){ const d = new Date(today); d.setDate(d.getDate()-30); from.value = fmt(d); to.value = fmt(today); }
    if (range==='month'){ const start = new Date(today.getFullYear(), today.getMonth(), 1); from.value = fmt(start); to.value = fmt(today); }
    if (range==='ytd'){ const start = new Date(today.getFullYear(), 0, 1); from.value = fmt(start); to.value = fmt(today); }
    updateDrawActiveFilters();
    refreshDrawPreview();
  });
  // Reset
  document.getElementById('btnResetDraw')?.addEventListener('click', ()=>{
    console.debug('[Draw] Reset filters');
    // reset selects/inputs
    const selC = document.getElementById('drawConfirmed'); if (selC) selC.value = '';
    const segC = document.getElementById('drawConfirmedSeg');
    segC?.querySelectorAll('.seg').forEach((b,i)=>{ const isActive = (b.getAttribute('data-val')||'')===''; b.setAttribute('aria-selected', isActive?'true':'false'); b.classList.toggle('active-primary', isActive); });
    const selR = document.getElementById('drawReturning'); if (selR) selR.value = '';
    const segR = document.getElementById('drawReturningSeg');
    segR?.querySelectorAll('.seg').forEach((b)=>{ const isActive = (b.getAttribute('data-val')||'')===''; b.setAttribute('aria-selected', isActive?'true':'false'); b.classList.toggle('active-primary', isActive); });
    const stars = document.getElementById('drawMinStars'); if (stars){ stars.value = '0'; document.getElementById('drawMinStarsOut').textContent = '0'; }
    const ctry = document.getElementById('drawCountry'); if (ctry) ctry.value = '';
    const from = document.getElementById('drawFrom'); if (from) from.value = '';
    const to = document.getElementById('drawTo'); if (to) to.value = '';
    const dateSeg = document.getElementById('drawDatePresets');
    dateSeg?.querySelectorAll('.seg').forEach((b)=>{ const isActive = b.getAttribute('data-range')==='all'; b.setAttribute('aria-selected', isActive?'true':'false'); b.classList.toggle('active-primary', isActive); });
    const dateModeSeg = document.getElementById('drawDateModeSeg');
    const dateModeSel = document.getElementById('drawDateMode'); if (dateModeSel) dateModeSel.value = 'created';
    dateModeSeg?.querySelectorAll('.seg').forEach((b)=>{ const isActive = b.getAttribute('data-mode')==='created'; b.setAttribute('aria-selected', isActive?'true':'false'); b.classList.toggle('active-primary', isActive); });
    refreshDrawPreview();
  });
  document.getElementById('btnSimulate')?.addEventListener('click', refreshDrawPreview);
  document.getElementById('btnPickWinner')?.addEventListener('click', async ()=>{
    console.debug('[Draw] Pick winner clicked');
    const crit = gatherDrawCriteria();
    const r = await fetch('/api/draw', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(crit), credentials:'include' });
    const j = await r.json();
    console.debug('[Draw] Pick winner response', j);
    if (!j.ok) { toast(j.error||'Failed to pick', true); return; }
    toast(`Winner: ${j.winnerEmail}`);
    refreshDrawHistory();
  });
  document.getElementById('btnExportEligible')?.addEventListener('click', (e)=>{
    e.preventDefault();
    console.debug('[Draw] Export click');
    const c = gatherDrawCriteria();
    const params = new URLSearchParams();
    if (c.confirmed!==undefined) params.set('confirmed', c.confirmed?'1':'0');
    if (c.minStars) params.set('minStars', String(c.minStars));
    if (c.returning) params.set('returning','1');
    if (c.countryCode) params.set('countryCode', c.countryCode);
    if (c.startDate) params.set('startDate', c.startDate);
    if (c.endDate) params.set('endDate', c.endDate);
    if (c.dateMode && c.dateMode!=='created') params.set('dateMode', c.dateMode);
    window.location.href = '/api/draw/export?'+params.toString();
  });
  refreshDrawPreview();
  refreshDrawHistory();
}

// Quick filters
function initQuickFilters(){
  document.querySelectorAll('#quickFilters [data-qf]')?.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const v = btn.getAttribute('data-qf');
      if (v==='') { subsState.filters.confirmed = ''; subsState.filters.q = ''; }
      if (v==='confirmed:1') subsState.filters.confirmed = '1';
      if (v==='confirmed:0') subsState.filters.confirmed = '0';
      if (v==='returning:1') { /* placeholder for future filter */ }
      if (v==='discount:1') { /* placeholder for future filter */ }
      subsState.page = 1; loadSubs();
    });
  });
}

// Range segmented control for signups
document.getElementById('signupsRange')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.seg'); if (!btn) return;
  const wrap = btn.parentElement;
  wrap.querySelectorAll('.seg').forEach(b=>b.setAttribute('aria-selected','false'));
  btn.setAttribute('aria-selected','true');
  loadStats();
});

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

// Vendors admin section
async function loadVendors(){
  try{
    const r = await fetch('/api/vendors', { credentials:'include' });
    const j = await r.json();
    const wrap = document.getElementById('vendorsList'); if (!wrap) return;
    if (!j.ok){ wrap.textContent = j.error||'Failed to load vendors'; return; }
    const rows = j.rows||[];
    wrap.innerHTML = `<table><thead><tr>
      <th>Email</th><th>Name</th><th>Company</th><th>Code</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    const tbody = wrap.querySelector('tbody');
    rows.forEach(v=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="code">${v.email}</span></td>
        <td>${v.name||''}</td>
        <td>${v.company||''}</td>
        <td><strong>${v.vendor_code}</strong></td>
        <td>${v.status}</td>
        <td>
          <button class="cta secondary" data-ven-toggle="${v._id}">${v.status==='active'?'Suspend':'Activate'}</button>
          <button class="cta danger" data-ven-del="${v._id}" style="margin-left:6px">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    // Bind actions
    wrap.querySelectorAll('[data-ven-toggle]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-ven-toggle');
        const row = rows.find(r=>String(r._id)===String(id));
        if (!row) return;
        const next = row.status==='active' ? 'suspended' : 'active';
        await fetch('/api/vendors/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: next }), credentials:'include' });
        loadVendors();
      });
    });
    wrap.querySelectorAll('[data-ven-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-ven-del');
        const ok = await confirmModal('Delete this vendor?'); if (!ok) return;
        await fetch('/api/vendors/'+id, { method:'DELETE', credentials:'include' });
        loadVendors();
      });
    });
  }catch{}
}

document.getElementById('vendorForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const out = document.getElementById('vendorMsg'); out.textContent = 'Saving...';
  const email = document.getElementById('venEmail').value.trim();
  const password = document.getElementById('venPassword').value;
  const name = document.getElementById('venName').value.trim();
  const company = document.getElementById('venCompany').value.trim();
  const vendor_code = document.getElementById('venCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{
    const r = await fetch('/api/vendors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, name, company, vendor_code: vendor_code||undefined }), credentials:'include' });
    const j = await r.json();
    if (!j.ok){ out.textContent = j.error||'Failed'; return; }
    out.textContent = 'Added'; (e.target).reset(); loadVendors();
  }catch{ out.textContent = 'Failed'; }
});

// Load vendors after page init
setTimeout(loadVendors, 350);


