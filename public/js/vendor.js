async function ensureVendor(){
  try{
    const r = await fetch('/api/vendors/me', { credentials:'include' });
    const j = await r.json();
    if (!j.ok){ location.href = '/vendor-login.html'; return null; }
    return j.vendor;
  }catch{ location.href = '/vendor-login.html'; return null; }
}

(async function init(){
  const v = await ensureVendor(); if (!v) return;
  document.getElementById('logout')?.addEventListener('click', async ()=>{ await fetch('/api/vendors/logout', { method:'POST', credentials:'include' }); location.href='/vendor-login.html'; });
  // Enforce mandatory password change on first login
  const mustChange = !!v.mustChangePassword;
  const linkSection = document.getElementById('linkSection');
  const pwdSection = document.getElementById('pwdSection');
  if (mustChange){
    if (linkSection) linkSection.style.display = 'none';
    if (pwdSection) { pwdSection.style.display = ''; pwdSection.scrollIntoView({ behavior:'smooth' }); }
  } else {
    if (linkSection) linkSection.style.display = '';
    if (pwdSection) pwdSection.style.display = 'none';
  }

  const link = `${location.origin}/?vendor=${encodeURIComponent(v.code)}`;
  const input = document.getElementById('shareLink'); if (input) input.value = link;
  document.getElementById('copyBtn')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(link); alert('Link copied'); }catch{} });
  const tw = `https://x.com/intent/tweet?text=${encodeURIComponent('Check out this Scottsdale stay and enter the giveaway!')}%20${encodeURIComponent(link)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  document.getElementById('shareTwitter').href = tw;
  document.getElementById('shareFacebook').href = fb;

  try{
    const r = await fetch('/api/vendors/stats', { credentials:'include' });
    const j = await r.json();
    if (j.ok){
      document.getElementById('kpiClicks').textContent = j.totals.clicks.toLocaleString();
      document.getElementById('kpiEntries').textContent = j.totals.total.toLocaleString();
      document.getElementById('kpiConfirmed').textContent = j.totals.confirmed.toLocaleString();
      document.getElementById('kpi7d').textContent = j.totals.last7d.toLocaleString();
      
      // Commission stats
      const totalEarned = j.commissions?.total_earned || 0;
      const totalPending = j.commissions?.total_pending || 0;
      document.getElementById('kpiEarned').textContent = `$${totalEarned.toFixed(2)}`;
      document.getElementById('kpiPending').textContent = `$${totalPending.toFixed(2)}`;
      
      const offeringSection = document.getElementById('offeringsSection'); if (offeringSection) offeringSection.style.display = '';
      const commissionSection = document.getElementById('commissionSection'); if (commissionSection) commissionSection.style.display = '';
      renderOfferings(j.offerings||[]);
      loadCommissionHistory();
    }
  }catch{}

  // Change password
  document.getElementById('pwdForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const out = document.getElementById('pwdMsg'); out.textContent = 'Saving...';
    const newPassword = document.getElementById('newPwd').value;
    try{
      const r = await fetch('/api/vendors/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ newPassword }), credentials:'include' });
      const j = await r.json();
      out.textContent = j.ok ? 'Updated' : (j.error||'Failed');
      if (j.ok){
        (e.target).reset();
        // Fetch me again to see new flag and reveal link section
        try{
          const m = await fetch('/api/vendors/me', { credentials:'include' });
          const mj = await m.json();
          if (mj.ok){
            if (linkSection) linkSection.style.display = '';
            if (pwdSection) pwdSection.style.display = 'none';
          }
        }catch{}
      }
    }catch{ out.textContent = 'Failed'; }
  });

  // Offerings CRUD
  document.getElementById('offerForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const out = document.getElementById('offerMsg'); out.textContent = 'Saving...';
    const title = document.getElementById('offTitle').value.trim();
    const description = document.getElementById('offDesc').value.trim();
    const url = document.getElementById('offUrl').value.trim();
    const priceStr = document.getElementById('offPrice').value;
    const price = priceStr? Number(priceStr) : undefined;
    const discount_code = document.getElementById('offDiscCode').value.trim();
    const discount_percent_str = document.getElementById('offDiscPct').value;
    const discount_percent = discount_percent_str? Number(discount_percent_str) : undefined;
    const discount_text = document.getElementById('offDiscText').value.trim();
    const image_url = document.getElementById('offImg').value.trim();
    const logo_url = document.getElementById('offLogo').value.trim();
    const fulfillment_type = document.getElementById('offFulfill').value;
    const commission_percent_str = document.getElementById('offCommission').value;
    const commission_percent = commission_percent_str? Number(commission_percent_str): undefined;
    const lead_price_str = document.getElementById('offLeadPrice').value;
    const lead_price = lead_price_str? Number(lead_price_str): undefined;
    const service_fee_str = document.getElementById('offServiceFee').value;
    const service_fee = service_fee_str? Number(service_fee_str): undefined;
    const sponsored_rank_str = document.getElementById('offRank').value;
    const sponsored_rank = sponsored_rank_str? Number(sponsored_rank_str): undefined;
    const is_featured = document.getElementById('offFeatured').checked;
    try{
      const r = await fetch('/api/vendors/offerings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, description, url, price, discount_code, discount_percent, discount_text, image_url, logo_url, fulfillment_type, commission_percent, lead_price, service_fee, sponsored_rank, is_featured }), credentials:'include' });
      const j = await r.json();
      if (!j.ok){ out.textContent = j.error||'Failed'; return; }
      out.textContent = 'Added'; (e.target).reset();
      // Refresh list
      const r2 = await fetch('/api/vendors/offerings', { credentials:'include' });
      const j2 = await r2.json(); if (j2.ok) renderOfferings(j2.rows||[]);
    }catch{ out.textContent = 'Failed'; }
  });
})();

function renderOfferings(rows){
  const wrap = document.getElementById('offeringsList'); if (!wrap) return;
  wrap.innerHTML = `<table><thead><tr>
    <th>Title</th><th>Description</th><th>URL</th><th>Price</th><th>Discount</th><th>Active</th><th>Actions</th>
  </tr></thead><tbody></tbody></table>`;
  const tbody = wrap.querySelector('tbody');
  rows.forEach(o=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.title||''}</td>
      <td>${o.description||''}</td>
      <td>${o.url?`<a class="reviews-link" href="${o.url}" target="_blank" rel="noopener">Link</a>`:''}</td>
      <td>${o.price!=null?o.price:''}</td>
      <td>${o.discount_percent!=null?`${o.discount_percent}%`:(o.discount_code||o.discount_text||'')}</td>
      <td>${o.active? 'Yes':'No'}</td>
      <td>
        <button class="cta secondary" data-off-toggle="${o._id}">${o.active?'Disable':'Enable'}</button>
        <button class="cta danger" data-off-del="${o._id}" style="margin-left:6px">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // Bind actions
  wrap.querySelectorAll('[data-off-toggle]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-off-toggle');
      const row = rows.find(r=>String(r._id)===String(id));
      const next = !row.active;
      await fetch('/api/vendors/offerings/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: next }), credentials:'include' });
      const r = await fetch('/api/vendors/offerings', { credentials:'include' });
      const j = await r.json(); if (j.ok) renderOfferings(j.rows||[]);
    });
  });
  wrap.querySelectorAll('[data-off-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-off-del');
      if (!confirm('Delete this offering?')) return;
      await fetch('/api/vendors/offerings/'+id, { method:'DELETE', credentials:'include' });
      const r = await fetch('/api/vendors/offerings', { credentials:'include' });
      const j = await r.json(); if (j.ok) renderOfferings(j.rows||[]);
    });
  });
}

async function loadCommissionHistory() {
  try {
    const r = await fetch('/api/vendors/commissions', { credentials: 'include' });
    const j = await r.json();
    const wrap = document.getElementById('commissionTable');
    if (!j.ok) { wrap.textContent = j.error || 'Failed to load commission history'; return; }
    
    const rows = j.rows || [];
    if (rows.length === 0) {
      wrap.innerHTML = '<p class="text-secondary">No commission history yet.</p>';
      return;
    }
    
    wrap.innerHTML = `<table><thead><tr>
      <th>Date</th><th>Offering</th><th>Type</th><th>Amount</th><th>Status</th><th>Notes</th>
    </tr></thead><tbody></tbody></table>`;
    
    const tbody = wrap.querySelector('tbody');
    rows.forEach(c => {
      const tr = document.createElement('tr');
      const date = new Date(c.created_at).toLocaleDateString();
      const statusClass = c.status === 'paid' ? 'success' : c.status === 'pending' ? 'warning' : 'secondary';
      tr.innerHTML = `<td>${date}</td>
        <td>${c.offering_title || '—'}</td>
        <td>${c.commission_type}</td>
        <td>$${c.commission_amount.toFixed(2)}</td>
        <td><span class="chip ${statusClass}">${c.status}</span></td>
        <td>${c.notes || '—'}</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading commission history:', err);
  }
}

