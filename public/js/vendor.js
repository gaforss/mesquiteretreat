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
})();

