// Payment page functionality
let currentInvoice = null;

// Load invoice on page load
document.addEventListener('DOMContentLoaded', function() {
  loadInvoice();
  setupEventListeners();
});

async function loadInvoice() {
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceNumber = urlParams.get('invoice');
  
  if (!invoiceNumber) {
    showError('No invoice number provided');
    return;
  }
  
  try {
    const response = await fetch(`/api/invoices/${invoiceNumber}`);
    const data = await response.json();
    
    if (data.ok) {
      currentInvoice = data.invoice;
      displayInvoice();
    } else {
      showError('Invoice not found');
    }
  } catch (error) {
    console.error('Error loading invoice:', error);
    showError('Failed to load invoice');
  }
}

function displayInvoice() {
  // Hide loading state
  document.getElementById('loadingState').classList.add('d-none');
  document.getElementById('invoiceDetails').classList.remove('d-none');
  
  // Populate invoice details
  document.getElementById('invoiceNumber').textContent = currentInvoice.invoice_number;
  document.getElementById('customerEmail').textContent = currentInvoice.customer_email;
  document.getElementById('customerName').textContent = currentInvoice.customer_name || 'N/A';
  document.getElementById('customerPhone').textContent = currentInvoice.customer_phone || 'N/A';
  
  // Stay information
  if (currentInvoice.check_in_date || currentInvoice.check_out_date) {
    document.getElementById('checkInDate').textContent = currentInvoice.check_in_date ? 
      new Date(currentInvoice.check_in_date).toLocaleDateString() : 'N/A';
    document.getElementById('checkOutDate').textContent = currentInvoice.check_out_date ? 
      new Date(currentInvoice.check_out_date).toLocaleDateString() : 'N/A';
    document.getElementById('reservationId').textContent = currentInvoice.reservation_id || 'N/A';
  } else {
    document.getElementById('stayInfo').style.display = 'none';
  }
  
  // Items
  const itemsList = document.getElementById('itemsList');
  itemsList.innerHTML = currentInvoice.items.map(item => `
    <div class="item-row">
      <div>
        <strong>${item.name}</strong>
        ${item.description ? `<br><small class="text-muted">${item.description}</small>` : ''}
      </div>
      <div class="text-end">
        <div>Qty: ${item.quantity}</div>
        <div>$${item.total_price}</div>
      </div>
    </div>
  `).join('');
  
  document.getElementById('totalAmount').textContent = `$${currentInvoice.total_amount}`;
  
  // Status badge
  const statusBadge = document.getElementById('statusBadge');
  statusBadge.textContent = currentInvoice.status.toUpperCase();
  statusBadge.className = `status-badge status-${currentInvoice.status}`;
  
  // Expiry date
  const expiryDate = new Date(currentInvoice.expires_at).toLocaleDateString();
  document.getElementById('expiryDate').textContent = expiryDate;
  
  // Show appropriate section based on status
  const now = new Date();
  const isExpired = now > new Date(currentInvoice.expires_at);
  
  if (currentInvoice.status === 'paid') {
    showAccessCode();
  } else if (isExpired) {
    showExpired();
  } else if (currentInvoice.status === 'pending') {
    showPaymentSection();
  } else {
    showError('Invoice status not supported');
  }
}

function showPaymentSection() {
  document.getElementById('paymentSection').classList.remove('d-none');
}

function showAccessCode() {
  document.getElementById('accessCodeSection').classList.remove('d-none');
  document.getElementById('accessCode').textContent = currentInvoice.lockbox_code;
  document.getElementById('accessInstructions').textContent = currentInvoice.access_instructions || 
    'Enter this code on the lockbox located in the 4th bedroom storage closet to access your items.';
  document.getElementById('accessExpiry').textContent = currentInvoice.access_expires_at ? 
    new Date(currentInvoice.access_expires_at).toLocaleDateString() : 'N/A';
}

function showExpired() {
  document.getElementById('expiredSection').classList.remove('d-none');
  document.getElementById('expiryWarning').style.display = 'none';
}

function showError(message) {
  document.getElementById('loadingState').classList.add('d-none');
  document.getElementById('errorState').classList.remove('d-none');
  document.getElementById('errorState').querySelector('p').textContent = message;
}

function setupEventListeners() {
  // Payment method selection
  document.querySelectorAll('.payment-method').forEach(method => {
    method.addEventListener('click', function() {
      document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
      this.classList.add('selected');
      this.querySelector('input[type="radio"]').checked = true;
    });
  });
  
  // Pay button
  document.getElementById('payButton').addEventListener('click', processPayment);
}

async function processPayment() {
  const payButton = document.getElementById('payButton');
  const originalText = payButton.innerHTML;
  payButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
  payButton.disabled = true;
  
  // Show processing modal
  const processingModal = new bootstrap.Modal(document.getElementById('processingModal'));
  processingModal.show();
  
  try {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    const response = await fetch(`/api/invoices/${currentInvoice.invoice_number}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_method: paymentMethod,
        payment_reference: `Manual payment - ${new Date().toISOString()}`
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      // Hide processing modal
      processingModal.hide();
      
      // Update current invoice
      currentInvoice = data.invoice;
      
      // Show success message
      showSuccessMessage();
      
      // Refresh display
      displayInvoice();
      
    } else {
      throw new Error(data.error || 'Payment failed');
    }
    
  } catch (error) {
    console.error('Payment error:', error);
    
    // Hide processing modal
    processingModal.hide();
    
    // Show error
    alert('Payment failed: ' + error.message);
    
  } finally {
    payButton.innerHTML = originalText;
    payButton.disabled = false;
  }
}

function showSuccessMessage() {
  // Create success toast
  const toast = document.createElement('div');
  toast.className = 'position-fixed top-0 end-0 p-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show" role="alert">
      <div class="toast-header bg-success text-white">
        <strong class="me-auto">Payment Successful!</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        Your payment has been processed successfully. Check your email for your access code.
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
} 