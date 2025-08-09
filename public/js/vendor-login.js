// DOM elements will be initialized after DOM is loaded
let form, msg, loginButton, emailInput, passwordInput;
let forgotPasswordModal, forgotPasswordForm, resetEmailInput, modalMsg, modalButton, forgotPasswordBtn, closeModalBtn;

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

// Login form submit handler
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // Basic validation
  if (!email || !password) {
    setMessage('Please fill in all fields', 'error');
    return;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setMessage('Please enter a valid email address', 'error');
    emailInput.focus();
    return;
  }
  
  setLoadingState(true);
  
  try {
    const res = await fetch('/api/vendors/login', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({ email, password }), 
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
      location.href = '/vendor.html';
    }, 1000);
    
  } catch (error) {
    console.error('Vendor login error:', error);
    setMessage('Network error. Please check your connection and try again.', 'error');
    setLoadingState(false);
  }
});

// Modal functions
function showForgotPassword() {
  forgotPasswordModal.classList.add('show');
  resetEmailInput.focus();
}

function hideForgotPassword() {
  forgotPasswordModal.classList.remove('show');
  forgotPasswordForm.reset();
  modalMsg.textContent = '';
  modalMsg.className = 'modal-message';
}



// Forgot password form handler
async function handleForgotPasswordSubmit(e) {
  e.preventDefault();
  
  const email = resetEmailInput.value.trim();
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    modalMsg.textContent = 'Please enter a valid email address';
    modalMsg.className = 'modal-message error';
    return;
  }
  
  // Set loading state
  modalButton.disabled = true;
  modalButton.textContent = 'Sending...';
  modalButton.style.opacity = '0.7';
  modalMsg.textContent = 'Sending reset link...';
  modalMsg.className = 'modal-message loading';
  
  try {
    const res = await fetch('/api/vendors/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      modalMsg.textContent = 'Reset link sent! Check your email for instructions.';
      modalMsg.className = 'modal-message success';
      modalButton.textContent = 'Sent!';
      modalButton.style.background = 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)';
      
      // Close modal after 3 seconds
      setTimeout(() => {
        hideForgotPassword();
      }, 3000);
    } else {
      modalMsg.textContent = data.error || 'Failed to send reset link. Please try again.';
      modalMsg.className = 'modal-message error';
      modalButton.disabled = false;
      modalButton.textContent = 'Send Reset Link';
      modalButton.style.opacity = '1';
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    modalMsg.textContent = 'Network error. Please check your connection and try again.';
    modalMsg.className = 'modal-message error';
    modalButton.disabled = false;
    modalButton.textContent = 'Send Reset Link';
    modalButton.style.opacity = '1';
  }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM elements
  form = document.getElementById('vendorLoginForm');
  msg = document.getElementById('msg');
  loginButton = document.querySelector('.login-button');
  emailInput = document.getElementById('vendorEmail');
  passwordInput = document.getElementById('vendorPassword');
  
  // Forgot password modal elements
  forgotPasswordModal = document.getElementById('forgotPasswordModal');
  forgotPasswordForm = document.getElementById('forgotPasswordForm');
  resetEmailInput = document.getElementById('resetEmail');
  modalMsg = document.getElementById('modalMsg');
  modalButton = forgotPasswordForm?.querySelector('.login-button');
  forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  closeModalBtn = document.getElementById('closeModalBtn');
  
  // Add event listeners
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', showForgotPassword);
  }
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideForgotPassword);
  }
  
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (e) => {
      if (e.target === forgotPasswordModal) {
        hideForgotPassword();
      }
    });
  }
  
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
  }
  
  // Add input focus effects
  [emailInput, passwordInput].forEach(input => {
    if (input) {
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
    }
  });
  
  // Add form submit listener
  if (form) {
    form.addEventListener('submit', handleLoginSubmit);
  }
  
  // Add some subtle animations on page load
  const loginCard = document.querySelector('.login-card');
  if (loginCard) {
    loginCard.style.opacity = '0';
    loginCard.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      loginCard.style.transition = 'all 0.6s ease';
      loginCard.style.opacity = '1';
      loginCard.style.transform = 'translateY(0)';
    }, 100);
  }
});

