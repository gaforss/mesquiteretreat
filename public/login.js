const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = 'Signing in...';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try{
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }), credentials: 'include' });
    const data = await res.json();
    if (!data.ok) { msg.textContent = data.error || 'Login failed'; return; }
    location.href = '/admin.html';
  }catch{ msg.textContent = 'Network error'; }
});

