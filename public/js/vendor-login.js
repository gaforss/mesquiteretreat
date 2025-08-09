const form = document.getElementById('vendorLoginForm');
const msg = document.getElementById('msg');
form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = 'Signing in...';
  const email = document.getElementById('vendorEmail').value.trim();
  const password = document.getElementById('vendorPassword').value;
  try{
    const res = await fetch('/api/vendors/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }), credentials:'include' });
    const j = await res.json();
    if (!j.ok){ msg.textContent = j.error||'Login failed'; return; }
    location.href = '/vendor.html';
  }catch{ msg.textContent = 'Network error'; }
});

