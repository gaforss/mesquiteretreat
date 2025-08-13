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
  // Always show link section; keep password section visible until set
  if (linkSection) linkSection.style.display = '';
  if (pwdSection) pwdSection.style.display = mustChange ? '' : 'none';
  if (mustChange && pwdSection) { try{ pwdSection.scrollIntoView({ behavior:'smooth' }); } catch{} }

  const link = `${location.origin}/?vendor=${encodeURIComponent(v.code)}`;
  const input = document.getElementById('shareLink'); if (input) input.value = link;
  // Also provide a short offline-friendly link
  const shortLink = `${location.origin}/api/public/r/${encodeURIComponent(v.code)}`;
  const shortEl = document.getElementById('shareLinkShort'); if (shortEl) shortEl.value = shortLink;
  document.getElementById('copyBtn')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(link); alert('Link copied'); }catch{} });
  document.getElementById('copyBtnShort')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(shortLink); alert('Short link copied'); }catch{} });
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

  // Live image/logo preview
  const imgUrlEl = document.getElementById('offImg');
  const imgThumb = document.getElementById('offImgThumb');
  const imgStatus = document.getElementById('offImgStatus');
  const logoUrlEl = document.getElementById('offLogo');
  const logoThumb = document.getElementById('offLogoThumb');
  const logoStatus = document.getElementById('offLogoStatus');
  if (imgUrlEl && imgThumb){
    imgUrlEl.addEventListener('input', ()=>{
      const url = imgUrlEl.value.trim();
      imgThumb.src = url||'';
      if (imgStatus) imgStatus.textContent = url ? 'Loading preview…' : 'Paste an image URL to preview';
    });
    imgThumb.addEventListener('load', ()=>{ if (imgStatus) imgStatus.textContent = 'Preview loaded'; });
    imgThumb.addEventListener('error', ()=>{ if (imgStatus) imgStatus.textContent = 'Image failed to load'; });
  }
  if (logoUrlEl && logoThumb){
    logoUrlEl.addEventListener('input', ()=>{
      const url = logoUrlEl.value.trim();
      logoThumb.src = url||'';
      if (logoStatus) logoStatus.textContent = url ? 'Loading preview…' : 'Paste a logo URL to preview';
    });
    logoThumb.addEventListener('load', ()=>{ if (logoStatus) logoStatus.textContent = 'Preview loaded'; });
    logoThumb.addEventListener('error', ()=>{ if (logoStatus) logoStatus.textContent = 'Logo failed to load'; });
  }
})();

function renderOfferings(rows){
  const wrap = document.getElementById('offeringsList'); if (!wrap) return;
  // Card grid UI
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  grid.style.gap = '12px';
  const base = location.origin;
  rows.forEach(o=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-body">
        ${o.image_url?`<img src="${o.image_url}" alt="${o.title||''}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;margin-bottom:8px;border:1px solid rgba(255,255,255,.12)"/>`:''}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          ${o.logo_url?`<img src="${o.logo_url}" alt="logo" style="width:32px;height:32px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.14)"/>`:''}
          <strong>${o.title||''}</strong>
          <span class="chip ${o.active?'yes':'secondary'}" style="margin-left:auto">${o.active?'Active':'Disabled'}</span>
        </div>
        <div class="small text-secondary" style="min-height:36px;margin-bottom:8px">${o.description||''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${o.price!=null?`<span class="chip">$${Number(o.price).toFixed(2)}</span>`:''}
          ${o.discount_percent!=null?`<span class="chip yes">${o.discount_percent}% off</span>`:''}
          ${o.discount_text?`<span class="chip">${o.discount_text}</span>`:''}
          ${o.discount_code?`<span class="chip">Code: ${o.discount_code}</span>`:''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${o.url?`<a class="cta secondary" href="${o.url}" target="_blank" rel="noopener">Open link</a>`:''}
          <button class="cta secondary" data-off-toggle="${o._id}">${o.active?'Disable':'Enable'}</button>
          <button class="cta danger" data-off-del="${o._id}">Delete</button>
        </div>
        ${o.url?`
        <div style=\"display:flex; gap:8px; align-items:center;\">
          <input class=\"share-off\" data-id=\"${o._id}\" value=\"${base}/api/public/go/${o._id}\" readonly />
          <button class=\"cta secondary\" data-copy-off=\"${o._id}\">Copy link</button>
        </div>
        `:''}
      </div>`;
    grid.appendChild(card);
  });
  wrap.innerHTML='';
  wrap.appendChild(grid);
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
  // Bind copy per-offering link
  wrap.querySelectorAll('[data-copy-off]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-copy-off');
      const inp = wrap.querySelector(`input.share-off[data-id="${CSS.escape(id)}"]`);
      const val = inp?.value || '';
      try{ await navigator.clipboard.writeText(val); alert('Share link copied'); }catch{}
    });
  });
}

async function loadCommissionHistory() {
  try {
    const r = await fetch('/api/vendors/lead-commission-requests', { credentials: 'include' });
    const j = await r.json();
    const wrap = document.getElementById('commissionTable');
    if (!j.ok) { wrap.textContent = j.error || 'Failed to load commission requests'; return; }
    
    const rows = j.rows || [];
    if (rows.length === 0) {
      wrap.innerHTML = '<p class="text-secondary">No commission requests yet.</p>';
      return;
    }
    
    wrap.innerHTML = `<table><thead><tr>
      <th>Date</th><th>Lead Type</th><th>Amount</th><th>Status</th><th>Your Response</th><th>Notes</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    
    const tbody = wrap.querySelector('tbody');
    rows.forEach(c => {
      const tr = document.createElement('tr');
      const date = new Date(c.created_at).toLocaleDateString();
      const statusClass = c.status === 'paid' ? 'success' : c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger';
      const responseClass = c.vendor_response === 'approved' ? 'success' : c.vendor_response === 'rejected' ? 'danger' : 'secondary';
      
      tr.innerHTML = `<td>${date}</td>
        <td>${c.lead_type}</td>
        <td class="commission-amount">$${c.commission_amount.toFixed(2)}</td>
        <td><span class="chip ${statusClass}">${c.status}</span></td>
        <td><span class="chip ${responseClass}">${c.vendor_response || 'pending'}</span></td>
        <td>${c.admin_notes || '—'}</td>
        <td>
          ${c.vendor_response === 'pending' ? `
            <button class="cta secondary" data-approve="${c._id}" style="margin-right:6px">Approve</button>
            <button class="cta danger" data-reject="${c._id}">Reject</button>
          ` : `
            <span class="text-secondary">${c.vendor_response === 'approved' ? 'Approved' : 'Rejected'}</span>
          `}
        </td>`;
      tbody.appendChild(tr);
    });
    
    // Bind approval/rejection actions
    wrap.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-approve');
        if (!confirm('Are you sure you want to approve this commission request?')) return;
        
        try {
          const r = await fetch(`/api/vendors/lead-commissions/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              vendor_response: 'approved',
              vendor_response_notes: 'Approved by vendor'
            }),
            credentials: 'include'
          });
          
          const j = await r.json();
          if (!j.ok) {
            alert(j.error || 'Failed to approve commission request');
            return;
          }
          
          alert('Commission request approved successfully!');
          loadCommissionHistory();
        } catch (err) {
          alert('Failed to approve commission request');
        }
      });
    });
    
    wrap.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-reject');
        const reason = prompt('Please provide a reason for rejecting this commission request:');
        if (reason === null) return; // User cancelled
        
        try {
          const r = await fetch(`/api/vendors/lead-commissions/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              vendor_response: 'rejected',
              vendor_response_notes: reason || 'Rejected by vendor'
            }),
            credentials: 'include'
          });
          
          const j = await r.json();
          if (!j.ok) {
            alert(j.error || 'Failed to reject commission request');
            return;
          }
          
          alert('Commission request rejected successfully!');
          loadCommissionHistory();
        } catch (err) {
          alert('Failed to reject commission request');
        }
      });
    });
  } catch (err) {
    console.error('Error loading commission requests:', err);
  }
}

