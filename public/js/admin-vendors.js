async function ensureAdmin(){
  try{
    const r = await fetch('/api/auth/me', { credentials:'include' });
    const j = await r.json();
    if (!j.ok) location.href = '/login.html';
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

async function loadVendors(){
  try{
    const r = await fetch('/api/vendors/with-stats', { credentials:'include' });
    const j = await r.json();
    const wrap = document.getElementById('vendorsTable'); if (!wrap) return;
    if (!j.ok){ wrap.textContent = j.error||'Failed to load vendors'; return; }
    const rows = j.rows||[];
    wrap.innerHTML = `<table><thead><tr>
      <th>Email</th><th>Name</th><th>Company</th><th>Code</th><th>Status</th><th>Clicks</th><th>Entries</th><th>Confirmed</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    const tbody = wrap.querySelector('tbody');
    rows.forEach(v=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="code">${v.email}</span></td>
        <td>${v.name||''}</td>
        <td>${v.company||''}</td>
        <td><strong>${v.vendor_code}</strong></td>
        <td>${v.status}</td>
        <td>${v.stats?.clicks||0}</td>
        <td>${v.stats?.total||0}</td>
        <td>${v.stats?.confirmed||0}</td>
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
        toast('Updated');
        loadVendors();
      });
    });
    wrap.querySelectorAll('[data-ven-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-ven-del');
        if (!confirm('Delete this vendor?')) return;
        await fetch('/api/vendors/'+id, { method:'DELETE', credentials:'include' });
        toast('Deleted');
        loadVendors();
      });
    });
  }catch{}
}

// Add vendor form
document.getElementById('vendorForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const out = document.getElementById('vendorMsg'); out.textContent = 'Saving...';
  const email = document.getElementById('venEmail').value.trim();
  const password = document.getElementById('venPassword').value;
  const name = document.getElementById('venName').value.trim();
  const company = document.getElementById('venCompany').value.trim();
  const vendor_code = document.getElementById('venCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{
    const r = await fetch('/api/vendors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: password||undefined, name, company, vendor_code: vendor_code||undefined }), credentials:'include' });
    const j = await r.json();
    if (!j.ok){ out.textContent = j.error||'Failed'; return; }
    out.textContent = 'Added'; (e.target).reset(); loadVendors();
  }catch{ out.textContent = 'Failed'; }
});

// Logout
document.getElementById('logout')?.addEventListener('click', async ()=>{
  await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
  location.href = '/login.html';
});

(async function init(){
  await ensureAdmin();
  loadVendors();
})();

