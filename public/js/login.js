const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');
const loginButton = document.querySelector('.login-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Add visual feedback classes
function setMessage(text, type = '') {
  msg.textContent = text;
  msg.className = `form-message ${type}`;
}

function setLoadingState(isLoading) {
  if (isLoading) {
    loginButton.disabled = true;
    loginButton.textContent = 'Signing In...';
    loginButton.style.opacity = '0.7';
    setMessage('Authenticating...', 'loading');
  } else {
    loginButton.disabled = false;
    loginButton.textContent = 'Sign In';
    loginButton.style.opacity = '1';
  }
}

// Add input focus effects
[usernameInput, passwordInput].forEach(input => {
  input.addEventListener('focus', () => {
    input.parentElement.style.transform = 'scale(1.02)';
  });
  
  input.addEventListener('blur', () => {
    input.parentElement.style.transform = 'scale(1)';
  });
  
  // Add enter key support
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  // Basic validation
  if (!username || !password) {
    setMessage('Please fill in all fields', 'error');
    return;
  }
  
  setLoadingState(true);
  
  try {
    const res = await fetch('/api/auth/login', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({ username, password }), 
      credentials: 'include' 
    });
    
    const data = await res.json();
    
    if (!data.ok) { 
      setMessage(data.error || 'Login failed. Please check your credentials.', 'error');
      setLoadingState(false);
      
      // Clear password field on error
      passwordInput.value = '';
      passwordInput.focus();
      return; 
    }
    
    // Success state
    setMessage('Login successful! Redirecting...', 'success');
    loginButton.textContent = 'Welcome!';
    loginButton.style.background = 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)';
    
    // Redirect after a brief delay to show success message
    setTimeout(() => {
      location.href = '/admin.html';
    }, 1000);
    
  } catch (error) {
    console.error('Login error:', error);
    setMessage('Network error. Please check your connection and try again.', 'error');
    setLoadingState(false);
  }
});

// Add some subtle animations on page load
document.addEventListener('DOMContentLoaded', () => {
  const loginCard = document.querySelector('.login-card');
  loginCard.style.opacity = '0';
  loginCard.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    loginCard.style.transition = 'all 0.6s ease';
    loginCard.style.opacity = '1';
    loginCard.style.transform = 'translateY(0)';
  }, 100);
});

