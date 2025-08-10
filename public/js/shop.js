// Shop page functionality
let products = [];
let cart = [];
let currentCategory = 'all';

// Load products on page load
document.addEventListener('DOMContentLoaded', function() {
  loadProducts();
  setupEventListeners();
});

function addToCart(productId) {
  const input = document.getElementById(`qty-${productId}`);
  if (!input) {
    showError('Quantity input not found');
    return;
  }
  
  const product = products.find(p => p._id === productId);
  if (!product) {
    showError('Product not found');
    return;
  }
  
  const maxPerOrder = (typeof product.max_quantity_per_order === 'number' && !Number.isNaN(product.max_quantity_per_order))
    ? product.max_quantity_per_order
    : 99;

  let quantity = parseInt(input.value, 10);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    // UX: default to 1 if user taps Add to Cart without picking qty
    quantity = Math.min(1, maxPerOrder);
  }
  
  if (quantity === 0) {
    showError('Please select a quantity');
    return;
  }
  
  // Check if already in cart
  const existingIndex = cart.findIndex(item => item.product_id === productId);
  
  if (existingIndex >= 0) {
    cart[existingIndex].quantity = Math.min(cart[existingIndex].quantity + quantity, maxPerOrder);
  } else {
    cart.push({
      product_id: productId,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: quantity
    });
  }
  
  // Reset quantity input
  input.value = 0;
  
  updateCartDisplay();
  showToast('Added to cart!');
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.ok) {
      products = data.products;
      renderProducts();
    } else {
      showError('Failed to load products: ' + data.error);
    }
  } catch (error) {
    console.error('Error loading products:', error);
    showError('Error loading products: ' + error.message);
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  
  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <h4>No products available</h4>
          <p class="text-muted">Please check back later or contact support.</p>
        </div>
      </div>
    `;
    return;
  }
  
  const filteredProducts = currentCategory === 'all' 
    ? products 
    : products.filter(p => p.category === currentCategory);
  

  
  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <h4>No products in this category</h4>
          <p class="text-muted">Try selecting a different category.</p>
        </div>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = filteredProducts.map(product => {
    const maxPerOrder = (typeof product.max_quantity_per_order === 'number' && !Number.isNaN(product.max_quantity_per_order))
      ? product.max_quantity_per_order
      : 99;
    return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="product-card">
        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="product-image">` : ''}
        <h5>${product.name}</h5>
        <p class="text-muted">${product.description || ''}</p>
        <div class="product-price">$${product.price}</div>
        
        <div class="quantity-controls">
          <button class="quantity-btn quantity-decrease" data-product-id="${product._id}">-</button>
          <input type="number" class="quantity-input" id="qty-${product._id}" value="0" min="0" max="${maxPerOrder}" readonly>
          <button class="quantity-btn quantity-increase" data-product-id="${product._id}">+</button>
        </div>
        
        <button class="btn btn-outline-warning btn-sm w-100 add-to-cart-btn" data-product-id="${product._id}">
          Add to Cart
        </button>
      </div>
    </div>
  `;}).join('');
  
  // Add event listeners to the newly created buttons
  setupProductEventListeners();
}

function updateQuantity(productId, change) {
  const input = document.getElementById(`qty-${productId}`);
  const currentQty = parseInt(input.value) || 0;
  const product = products.find(p => p._id === productId);
  
  if (product) {
    const maxPerOrder = (typeof product.max_quantity_per_order === 'number' && !Number.isNaN(product.max_quantity_per_order))
      ? product.max_quantity_per_order
      : 99;
    const newQty = Math.max(0, Math.min(currentQty + change, maxPerOrder));
    input.value = Number.isFinite(newQty) ? newQty : 0;
  }
}



function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="text-muted">No items in cart</p>';
    cartTotal.classList.add('d-none');
    return;
  }
  
  let total = 0;
  cartItems.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="cart-item">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${item.name}</strong><br>
            <small class="text-muted">Qty: ${item.quantity}</small>
          </div>
          <div class="text-end">
            <div>$${itemTotal}</div>
            <button class="btn btn-sm btn-outline-danger remove-from-cart-btn" data-product-id="${item.product_id}">×</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      removeFromCart(productId);
    });
  });
  
  document.getElementById('totalAmount').textContent = `$${total}`;
  cartTotal.classList.remove('d-none');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product_id !== productId);
  updateCartDisplay();
  showToast('Removed from cart');
}

function setupEventListeners() {
  // Category filters
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.getAttribute('data-category');
      renderProducts();
    });
  });
  
  // Delegated events for products grid
  const productsGrid = document.getElementById('productsGrid');
  if (productsGrid) {
    productsGrid.addEventListener('click', function(event) {
      const addBtn = event.target.closest('.add-to-cart-btn');
      if (addBtn) {
        event.preventDefault();
        event.stopPropagation();
        const productId = addBtn.getAttribute('data-product-id');
        addToCart(productId);
        return;
      }

      const incBtn = event.target.closest('.quantity-increase');
      if (incBtn) {
        event.preventDefault();
        const productId = incBtn.getAttribute('data-product-id');
        updateQuantity(productId, 1);
        return;
      }

      const decBtn = event.target.closest('.quantity-decrease');
      if (decBtn) {
        event.preventDefault();
        const productId = decBtn.getAttribute('data-product-id');
        updateQuantity(productId, -1);
      }
    });
  }
  
  // Checkout button
  document.getElementById('checkoutBtn').addEventListener('click', function() {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    openCheckoutModal();
  });
  
  // Submit order button
  document.getElementById('submitOrderBtn').addEventListener('click', submitOrder);
}

function setupProductEventListeners() {
  // Quantity decrease buttons
  const decreaseBtns = document.querySelectorAll('.quantity-decrease');
  decreaseBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      updateQuantity(productId, -1);
    });
  });
  
  // Quantity increase buttons
  const increaseBtns = document.querySelectorAll('.quantity-increase');
  increaseBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      updateQuantity(productId, 1);
    });
  });
  
  // Add to cart buttons
  const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
  addToCartBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      addToCart(productId);
    });
  });
}

function openCheckoutModal() {
  const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
  
  // Populate modal with cart items
  const modalCartItems = document.getElementById('modalCartItems');
  const modalTotalAmount = document.getElementById('modalTotalAmount');
  
  let total = 0;
  modalCartItems.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="d-flex justify-content-between mb-2">
        <span>${item.name} (Qty: ${item.quantity})</span>
        <span>$${itemTotal}</span>
      </div>
    `;
  }).join('');
  
  modalTotalAmount.textContent = `$${total}`;
  modal.show();
}

async function submitOrder() {
  const submitBtn = document.getElementById('submitOrderBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
  submitBtn.disabled = true;
  
  try {
    const formData = {
      customer_email: document.getElementById('customerEmail').value,
      customer_name: document.getElementById('customerName').value,
      customer_phone: document.getElementById('customerPhone').value,
      check_in_date: document.getElementById('checkInDate').value,
      check_out_date: document.getElementById('checkOutDate').value,
      reservation_id: document.getElementById('reservationId').value,
      items: cart
    };
    
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      // Close checkout modal
      bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
      
      // Show success modal
      document.getElementById('invoiceNumber').textContent = data.invoice.invoice_number;
      const successModal = new bootstrap.Modal(document.getElementById('successModal'));
      successModal.show();
      
      // Clear cart
      cart = [];
      updateCartDisplay();
      
    } else {
      alert('Error creating invoice: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error submitting order:', error);
    alert('Error creating invoice. Please try again.');
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

function showToast(message) {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = 'position-fixed top-0 end-0 p-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show" role="alert">
      <div class="toast-header">
        <strong class="me-auto">Shop</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 3000);
}

function showError(message) {
  // Error toast implementation
  const toast = document.createElement('div');
  toast.className = 'position-fixed top-0 end-0 p-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show" role="alert">
      <div class="toast-header bg-danger text-white">
        <strong class="me-auto">Error</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

// Debug: Test if functions are available
console.log('Shop functions loaded successfully'); 