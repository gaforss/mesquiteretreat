const form = document.getElementById('resetPasswordForm');
const msg = document.getElementById('msg');
const resetButton = document.querySelector('.login-button');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Check if token exists
if (!token) {
  msg.textContent = 'Invalid reset link. Please request a new password reset.';
  msg.className = 'form-message error';
  form.style.display = 'none';
  document.querySelector('.back-to-login').style.display = 'block';
}

// Add visual feedback classes
function setMessage(text, type = '') {
  msg.textContent = text;
  msg.className = `form-message ${type}`;
}

function setLoadingState(isLoading) {
  if (isLoading) {
    resetButton.disabled = true;
    resetButton.textContent = 'Resetting...';
    resetButton.style.opacity = '0.7';
    setMessage('Resetting your password...', 'loading');
  } else {
    resetButton.disabled = false;
    resetButton.textContent = 'Reset Password';
    resetButton.style.opacity = '1';
  }
}

// Add input focus effects
[newPasswordInput, confirmPasswordInput].forEach(input => {
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

// Password strength validation
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  if (password.length < minLength) errors.push(`At least ${minLength} characters`);
  if (!hasUpperCase) errors.push('One uppercase letter');
  if (!hasLowerCase) errors.push('One lowercase letter');
  if (!hasNumbers) errors.push('One number');
  if (!hasSpecialChar) errors.push('One special character');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Basic validation
  if (!newPassword || !confirmPassword) {
    setMessage('Please fill in all fields', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    setMessage('Passwords do not match', 'error');
    confirmPasswordInput.focus();
    return;
  }
  
  // Password strength validation
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    setMessage(`Password must contain: ${passwordValidation.errors.join(', ')}`, 'error');
    newPasswordInput.focus();
    return;
  }
  
  setLoadingState(true);
  
  try {
    const res = await fetch('/api/vendors/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        token,
        newPassword 
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      setMessage('Password reset successfully! Redirecting to login...', 'success');
      resetButton.textContent = 'Success!';
      resetButton.style.background = 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)';
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = '/vendor-login.html';
      }, 2000);
    } else {
      setMessage(data.error || 'Failed to reset password. Please try again.', 'error');
      setLoadingState(false);
    }
  } catch (error) {
    console.error('Reset password error:', error);
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