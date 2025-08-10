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
    if (!j.ok){ wrap.textContent = j.error||'Failed to load partners'; return; }
    const rows = j.rows||[];
    wrap.innerHTML = `<table><thead><tr>
      <th>Email</th><th>Name</th><th>Company</th><th>Code</th><th>Status</th><th>Clicks</th><th>Entries</th><th>Confirmed</th><th>Total Earned</th><th>Pending</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    const tbody = wrap.querySelector('tbody');
    rows.forEach(v=>{
      const tr = document.createElement('tr');
      // Use lead commission data (YOU earn from vendors) instead of vendor commission data
      const totalEarned = v.leadCommissions?.total_earned || 0;
      const totalPending = v.leadCommissions?.total_pending || 0;
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
        if (!confirm('Delete this partner?')) return;
        await fetch('/api/vendors/'+id, { method:'DELETE', credentials:'include' });
        toast('Deleted');
        loadVendors();
      });
    });
    
  }catch{}
}

async function loadCommissions() {
  try {
    const vendorFilter = document.getElementById('commissionVendorFilter').value;
    const statusFilter = document.getElementById('commissionStatusFilter').value;
    
    let url = '/api/vendors/lead-commissions';
    const params = new URLSearchParams();
    if (vendorFilter) params.set('vendor_code', vendorFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (params.toString()) url += '?' + params.toString();
    
    const r = await fetch(url, { credentials: 'include' });
    const j = await r.json();
    const wrap = document.getElementById('commissionTable');
    if (!j.ok) { wrap.textContent = j.error || 'Failed to load commissions'; return; }
    
    const rows = j.rows || [];
    if (rows.length === 0) {
      wrap.innerHTML = '<p class="text-secondary">No commission requests found.</p>';
      return;
    }
    
    wrap.innerHTML = `<table><thead><tr>
      <th>Date</th><th>Partner</th><th>Lead Type</th><th>Commission Amount</th><th>Status</th><th>Partner Response</th><th>Notes</th><th>Actions</th>
    </tr></thead><tbody></tbody></table>`;
    
    const tbody = wrap.querySelector('tbody');
    rows.forEach(c => {
      const tr = document.createElement('tr');
      const date = new Date(c.created_at).toLocaleDateString();
      const statusClass = c.status === 'paid' ? 'success' : c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger';
      const responseClass = c.vendor_response === 'approved' ? 'success' : c.vendor_response === 'rejected' ? 'danger' : 'secondary';
      
      tr.innerHTML = `<td>${date}</td>
        <td>${c.vendor_name || c.vendor_email}</td>
        <td>${c.lead_type}</td>
        <td class="commission-amount">$${c.commission_amount.toFixed(2)}</td>
        <td><span class="chip ${statusClass}">${c.status}</span></td>
        <td><span class="chip ${responseClass}">${c.vendor_response || 'pending'}</span></td>
        <td>${c.admin_notes || '—'}</td>
        <td>
          <button class="cta secondary" data-comm-status="${c._id}" data-current-status="${c.status}">${c.status === 'pending' ? 'Mark Paid' : c.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}</button>
          <button class="cta danger" data-comm-delete="${c._id}" style="margin-left:6px">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    
    // Bind commission actions
    wrap.querySelectorAll('[data-comm-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-comm-status');
        const currentStatus = btn.getAttribute('data-current-status');
        const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
        
        try {
          const response = await fetch(`/api/vendors/lead-commissions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
            credentials: 'include'
          });
          
          const result = await response.json();
          
          if (!result.ok) {
            toast(result.error || 'Failed to update status', true);
            return;
          }
          
          toast(`Status updated to ${newStatus}`);
          loadCommissions();
        } catch (error) {
          console.error('Error updating commission status:', error);
          toast('Failed to update status', true);
        }
      });
    });
    
    // Delete commission functionality
    wrap.querySelectorAll('[data-comm-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-comm-delete');
        if (!confirm('Are you sure you want to delete this commission?')) return;
        
        try {
          const r = await fetch(`/api/vendors/lead-commissions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const j = await r.json();
          if (!j.ok) {
            toast(j.error || 'Failed to delete commission', true);
            return;
          }
          
          toast('Commission deleted successfully');
          loadCommissions();
          loadVendors(); // Refresh vendor list to update totals
        } catch (err) {
          toast('Failed to delete commission', true);
        }
      });
    });
    
  } catch (err) {
    console.error('Error loading commissions:', err);
  }
}

// Open add vendor modal
document.getElementById('addVendorBtn')?.addEventListener('click', ()=>{
  document.getElementById('vendorModal')?.classList.remove('hidden');
});

// Add vendor form (modal)
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
    out.textContent = 'Added'; (e.target).reset();
    document.getElementById('vendorModal')?.classList.add('hidden');
    loadVendors();
  }catch{ out.textContent = 'Failed'; }
});

// Commission form
document.getElementById('addCommissionBtn')?.addEventListener('click', async () => {
  document.getElementById('commissionModal').classList.remove('hidden');
  await loadVendorDropdown();
});

// Commission filters
document.getElementById('commissionVendorFilter')?.addEventListener('change', loadCommissions);
document.getElementById('commissionStatusFilter')?.addEventListener('change', loadCommissions);
document.getElementById('refreshCommissions')?.addEventListener('click', loadCommissions);

// Load vendor dropdown for commission filter
async function loadCommissionVendorFilter() {
  try {
    const r = await fetch('/api/vendors', { credentials: 'include' });
    const j = await r.json();
    if (!j.ok) return;
    
    const vendorFilter = document.getElementById('commissionVendorFilter');
    if (!vendorFilter) return;
    
    // Clear existing options except the first one
    vendorFilter.innerHTML = '<option value="">All partners</option>';
    
    // Add vendor options
    j.rows.forEach(vendor => {
      const option = document.createElement('option');
      option.value = vendor.vendor_code;
      option.textContent = `${vendor.name || vendor.company || vendor.email} (${vendor.vendor_code})`;
      vendorFilter.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading vendor filter:', err);
  }
}

// Load vendor dropdown
async function loadVendorDropdown() {
  try {
    const r = await fetch('/api/vendors', { credentials: 'include' });
    const j = await r.json();
    if (!j.ok) return;
    
    const vendorSelect = document.getElementById('vendorSelect');
    
    // Clear existing options except the first one
    vendorSelect.innerHTML = '<option value="">Select a partner...</option>';
    
    // Add vendor options
    j.rows.forEach(vendor => {
      const option = document.createElement('option');
      option.value = JSON.stringify({
        id: vendor._id,
        code: vendor.vendor_code,
        email: vendor.email,
        name: vendor.name || vendor.company || vendor.email
      });
      option.textContent = `${vendor.name || vendor.company || vendor.email} (${vendor.vendor_code})`;
      vendorSelect.appendChild(option);
    });
    
  } catch (err) {
    console.error('Error loading vendors:', err);
  }
}

document.getElementById('commissionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const vendorSelect = document.getElementById('vendorSelect');
  const leadType = document.getElementById('leadType').value;
  const commissionAmount = Number(document.getElementById('commissionAmount').value);
  const subscriberEmail = document.getElementById('subscriberEmail').value.trim();
  const adminNotes = document.getElementById('commissionNotes').value.trim();
  
  if (!vendorSelect.value || !commissionAmount || commissionAmount <= 0) {
    toast('Please select a partner and provide a valid commission amount', true);
    return;
  }
  
  const vendorData = JSON.parse(vendorSelect.value);
  
  try {
    const r = await fetch('/api/vendors/lead-commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: vendorData.id,
        vendor_code: vendorData.code,
        vendor_email: vendorData.email,
        vendor_name: vendorData.name,
        lead_type: leadType,
        commission_amount: commissionAmount,
        commission_type: 'lead', // Default to lead type
        subscriber_email: subscriberEmail,
        admin_notes: adminNotes
      }),
      credentials: 'include'
    });
    
    const j = await r.json();
    if (!j.ok) {
      toast(j.error || 'Failed to add commission', true);
      return;
    }
    
    toast('Commission request sent successfully');
    document.getElementById('commissionModal').classList.add('hidden');
    document.getElementById('commissionForm').reset();
    
    // Refresh commissions and vendor list
    loadCommissions();
    loadVendors();
  } catch (err) {
    toast('Failed to add commission', true);
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
        m.querySelector('h3').textContent = 'Add Commission Request';
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
        m.querySelector('h3').textContent = 'Add Commission Request';
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
  loadCommissions();
  loadCommissionVendorFilter();
})();

