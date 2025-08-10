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
      <th>Email</th><th>Name</th><th>Company</th><th>Code</th><th>Status</th><th>Clicks</th><th>Entries</th><th>Confirmed</th><th>Total Earned</th><th>Pending</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    const tbody = wrap.querySelector('tbody');
    rows.forEach(v=>{
      const tr = document.createElement('tr');
      const totalEarned = v.commissions?.total_earned || 0;
      const totalPending = v.commissions?.total_pending || 0;
      tr.innerHTML = `<td><span class="code">${v.email}</span></td>
        <td>${v.name||''}</td>
        <td>${v.company||''}</td>
        <td><strong>${v.vendor_code}</strong></td>
        <td>${v.status}</td>
        <td>${v.stats?.clicks||0}</td>
        <td>${v.stats?.total||0}</td>
        <td>${v.stats?.confirmed||0}</td>
        <td>$${totalEarned.toFixed(2)}</td>
        <td>$${totalPending.toFixed(2)}</td>
        <td>
          <button class="cta secondary" data-ven-toggle="${v._id}">${v.status==='active'?'Suspend':'Activate'}</button>
          <button class="cta secondary" data-ven-commissions="${v._id}" style="margin-left:6px">Commissions</button>
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
    
    // Commission management
    wrap.querySelectorAll('[data-ven-commissions]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-ven-commissions');
        const row = rows.find(r=>String(r._id)===String(id));
        if (!row) return;
        openCommissionManagement(id, row);
      });
    });
  }catch{}
}

// Commission management
let currentVendorId = null;
let currentVendorData = null;

async function openCommissionManagement(vendorId, vendorData) {
  currentVendorId = vendorId;
  currentVendorData = vendorData;
  
  document.getElementById('commissionSection').style.display = '';
  document.getElementById('commissionSection').scrollIntoView({ behavior: 'smooth' });
  
  await loadCommissions();
}

async function loadCommissions() {
  if (!currentVendorId) return;
  
  try {
    const r = await fetch(`/api/vendors/${currentVendorId}/commissions`, { credentials: 'include' });
    const j = await r.json();
    const wrap = document.getElementById('commissionTable');
    if (!j.ok) { wrap.textContent = j.error || 'Failed to load commissions'; return; }
    
    const rows = j.rows || [];
    wrap.innerHTML = `<table><thead><tr>
      <th>Date</th><th>Offering</th><th>Type</th><th>Amount</th><th>Status</th><th>Notes</th><th>Actions</th>
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
        <td>${c.notes || '—'}</td>
        <td>
          <button class="cta secondary" data-comm-edit="${c._id}">Edit</button>
          <button class="cta secondary" data-comm-status="${c._id}" data-current-status="${c.status}">${c.status === 'pending' ? 'Mark Paid' : c.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}</button>
        </td>`;
      tbody.appendChild(tr);
    });
    
    // Bind commission actions
    wrap.querySelectorAll('[data-comm-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-comm-status');
        const currentStatus = btn.getAttribute('data-current-status');
        const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
        
        await fetch(`/api/vendors/commissions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
          credentials: 'include'
        });
        
        toast('Status updated');
        loadCommissions();
      });
    });
    
    // Edit commission functionality
    wrap.querySelectorAll('[data-comm-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-comm-edit');
        const row = rows.find(r => String(r._id) === String(id));
        if (!row) return;
        
        // Populate modal with existing data
        document.getElementById('commissionAmount').value = row.commission_amount || '';
        document.getElementById('commissionType').value = row.commission_type || 'percentage';
        document.getElementById('commissionPercent').value = row.commission_percent || '';
        document.getElementById('transactionAmount').value = row.transaction_amount || '';
        document.getElementById('leadPrice').value = row.lead_price || '';
        document.getElementById('serviceFee').value = row.service_fee || '';
        document.getElementById('offeringTitle').value = row.offering_title || '';
        document.getElementById('commissionNotes').value = row.notes || '';
        
        // Store the commission ID for editing
        document.getElementById('commissionModal').dataset.editId = id;
        document.getElementById('commissionModal').querySelector('h3').textContent = 'Edit Commission';
        document.getElementById('commissionModal').classList.remove('hidden');
      });
    });
    
  } catch (err) {
    console.error('Error loading commissions:', err);
  }
}

// Add vendor form
document.getElementById('vendorForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const out = document.getElementById('vendorMsg'); out.textContent = 'Saving...';
  const email = document.getElementById('venEmail').value.trim();
  const name = document.getElementById('venName').value.trim();
  const company = document.getElementById('venCompany').value.trim();
  const vendor_code = document.getElementById('venCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{
    const r = await fetch('/api/vendors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, name, company, vendor_code: vendor_code||undefined }), credentials:'include' });
    const j = await r.json();
    if (!j.ok){ out.textContent = j.error||'Failed'; return; }
    out.textContent = 'Added'; (e.target).reset(); loadVendors();
  }catch{ out.textContent = 'Failed'; }
});

// Commission form
document.getElementById('addCommissionBtn')?.addEventListener('click', () => {
  document.getElementById('commissionModal').classList.remove('hidden');
});

// Dynamic form behavior based on commission type
document.getElementById('commissionType')?.addEventListener('change', (e) => {
  const type = e.target.value;
  const amountField = document.getElementById('commissionAmount');
  const percentField = document.getElementById('commissionPercent');
  const leadPriceField = document.getElementById('leadPrice');
  
  // Reset fields
  amountField.value = '';
  percentField.value = '';
  leadPriceField.value = '';
  
  if (type === 'percentage') {
    amountField.placeholder = 'Leave empty for percentage-based';
    percentField.placeholder = 'e.g. 15 for 15%';
    leadPriceField.style.display = 'none';
    leadPriceField.parentElement.style.display = 'none';
  } else if (type === 'fixed') {
    amountField.placeholder = 'Fixed dollar amount';
    percentField.placeholder = 'Leave empty for fixed amount';
    leadPriceField.style.display = 'none';
    leadPriceField.parentElement.style.display = 'none';
  } else if (type === 'lead') {
    amountField.placeholder = 'Fixed dollar amount per lead';
    percentField.placeholder = 'Leave empty for lead-based';
    leadPriceField.style.display = 'block';
    leadPriceField.parentElement.style.display = 'block';
  }
});

document.getElementById('commissionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentVendorId) return;
  
  const commissionAmountInput = document.getElementById('commissionAmount').value;
  const commissionAmount = commissionAmountInput ? Number(commissionAmountInput) : 0;
  const commissionType = document.getElementById('commissionType').value;
  const commissionPercentInput = document.getElementById('commissionPercent').value;
  const commissionPercent = commissionPercentInput ? Number(commissionPercentInput) : null;
  const transactionAmount = document.getElementById('transactionAmount').value ? Number(document.getElementById('transactionAmount').value) : null;
  const leadPrice = document.getElementById('leadPrice').value ? Number(document.getElementById('leadPrice').value) : null;
  const serviceFee = document.getElementById('serviceFee').value ? Number(document.getElementById('serviceFee').value) : null;
  const offeringTitle = document.getElementById('offeringTitle').value.trim();
  const notes = document.getElementById('commissionNotes').value.trim();
  
  // Validate that either commission amount or percentage is provided
  if (commissionAmount <= 0 && (!commissionPercent || commissionPercent <= 0)) {
    toast('Please provide either a commission amount or percentage', true);
    return;
  }
  
  const editId = document.getElementById('commissionModal').dataset.editId;
  const isEditing = !!editId;
  
  try {
    const url = isEditing 
      ? `/api/vendors/commissions/${editId}`
      : `/api/vendors/${currentVendorId}/commissions`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    const r = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_amount: commissionAmount,
        commission_type: commissionType,
        commission_percent: commissionPercent,
        transaction_amount: transactionAmount,
        lead_price: leadPrice,
        service_fee: serviceFee,
        offering_title: offeringTitle,
        notes
      }),
      credentials: 'include'
    });
    
    const j = await r.json();
    if (!j.ok) {
      toast(j.error || `Failed to ${isEditing ? 'update' : 'add'} commission`, true);
      return;
    }
    
    toast(`Commission ${isEditing ? 'updated' : 'added'} successfully`);
    document.getElementById('commissionModal').classList.add('hidden');
    document.getElementById('commissionForm').reset();
    delete document.getElementById('commissionModal').dataset.editId;
    document.getElementById('commissionModal').querySelector('h3').textContent = 'Add Commission';
    loadCommissions();
    loadVendors(); // Refresh vendor list to update totals
  } catch (err) {
    toast(`Failed to ${isEditing ? 'update' : 'add'} commission`, true);
  }
});

// Modal helpers
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(m => {
      m.classList.add('hidden');
      // Reset commission modal
      if (m.id === 'commissionModal') {
        m.querySelector('form').reset();
        delete m.dataset.editId;
        m.querySelector('h3').textContent = 'Add Commission';
      }
    });
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(m => {
      m.classList.add('hidden');
      // Reset commission modal
      if (m.id === 'commissionModal') {
        m.querySelector('form').reset();
        delete m.dataset.editId;
        m.querySelector('h3').textContent = 'Add Commission';
      }
    });
  }
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

