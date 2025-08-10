// Admin invoices page functionality
document.addEventListener('DOMContentLoaded', function() {
  loadInvoices();
  loadProducts();
  setupEventListeners();
  // Handle edit invoice form submit
  const editForm = document.getElementById('editInvoiceForm');
  if (editForm) {
    editForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const invoiceNumber = document.getElementById('editInvoiceNumber').value;
      const payload = {
        status: document.getElementById('editInvoiceStatus').value,
        lockbox_code: document.getElementById('editInvoiceLockbox').value || undefined,
        admin_notes: document.getElementById('editInvoiceNotes').value || undefined
      };
      try {
        const response = await fetch(`/api/invoices/${invoiceNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await parseJsonSafe(response);
        if (data.ok) {
          showToast('Invoice updated');
          document.getElementById('editInvoiceModal').classList.add('hidden');
          loadInvoices();
        } else {
          showToast('Failed to update invoice', true);
        }
      } catch (error) {
        console.error('Error updating invoice:', error);
        showToast('Failed to update invoice', true);
      }
    });
  }
});

async function parseJsonSafe(response){
  try {
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await response.json();
    const text = await response.text();
    return { ok: false, error: text };
  } catch (e){
    return { ok: false, error: 'Invalid JSON' };
  }
}

// Invoice management
async function loadInvoices() {
  try {
    const response = await fetch('/api/invoices');
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Failed to load invoices:', data.error);
      return;
    }
    
    renderInvoicesTable(data.invoices);
  } catch (error) {
    console.error('Error loading invoices:', error);
  }
}

function renderInvoicesTable(invoices) {
  const container = document.getElementById('invoicesTable');
  if (!container) return;
  
  if (invoices.length === 0) {
    container.innerHTML = '<p class="text-muted">No invoices found</p>';
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${invoices.map(invoice => `
          <tr>
            <td><code>${invoice.invoice_number}</code></td>
            <td>
              <div>${invoice.customer_name || 'N/A'}</div>
              <small class="text-muted">${invoice.customer_email}</small>
            </td>
            <td>$${invoice.total_amount}</td>
            <td>
              <span class="badge-pill status-pill status-${invoice.status}">${invoice.status}</span>
            </td>
            <td>${new Date(invoice.created_at).toLocaleDateString()}</td>
            <td>
              <button class="cta secondary cta-sm" onclick="viewInvoice('${invoice.invoice_number}')">View</button>
              <button class="cta secondary cta-sm" onclick="openEditInvoice('${invoice.invoice_number}')">Edit</button>
              <button class="cta danger cta-sm" onclick="deleteInvoice('${invoice.invoice_number}')">Delete</button>
              ${invoice.status === 'pending' ? `<button class=\"cta cta-sm\" onclick=\"markAsPaid('${invoice.invoice_number}')\">Mark Paid</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function getStatusColor(status) {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'danger';
    case 'expired': return 'secondary';
    default: return 'secondary';
  }
}

async function viewInvoice(invoiceNumber) {
  try {
    const response = await fetch(`/api/invoices/${invoiceNumber}`);
    const data = await response.json();
    
    if (!data.ok) {
      alert('Failed to load invoice');
      return;
    }
    
    const invoice = data.invoice;

    const modalEl = document.getElementById('invoiceDetailsModal');
    const titleEl = document.getElementById('invoiceDetailsTitle');
    const subEl = document.getElementById('invoiceDetailsSub');
    const bodyEl = document.getElementById('invoiceDetailsBody');

    titleEl.textContent = `Invoice #${invoice.invoice_number}`;
    subEl.textContent = `${new Date(invoice.created_at).toLocaleString()}`;

    bodyEl.innerHTML = `
      <div class="section-card" style="margin:0 0 10px">
        <div class="section-body" style="padding:0">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding: 10px 12px; border-bottom:1px solid var(--border)">
            <div>
              <div class="small text-secondary">Customer</div>
              <div><strong>${invoice.customer_name || 'N/A'}</strong></div>
              <div class="small text-secondary">${invoice.customer_email}</div>
              ${invoice.customer_phone ? `<div class="small text-secondary">${invoice.customer_phone}</div>` : ''}
            </div>
            <div>
              <div class="small text-secondary">Details</div>
              <div style="margin-top:4px">
                <span class="badge-pill status-pill status-${invoice.status}">${invoice.status}</span>
              </div>
              <div class="small text-secondary" style="margin-top:6px"><strong>Total:</strong> $${invoice.total_amount}</div>
              ${invoice.lockbox_code ? `<div class="small text-secondary"><strong>Lockbox:</strong> <code>${invoice.lockbox_code}</code></div>` : ''}
            </div>
          </div>
          <div class="table-scroll" style="padding:10px 12px">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>$${item.unit_price}</td>
                      <td>$${item.total_price}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          ${invoice.admin_notes ? `<div style="padding: 0 12px 10px"><div class="small text-secondary">Admin notes</div><div>${invoice.admin_notes}</div></div>` : ''}
        </div>
      </div>
    `;

    modalEl.classList.remove('hidden');

  } catch (error) {
    console.error('Error viewing invoice:', error);
    alert('Failed to load invoice details');
  }
}

async function markAsPaid(invoiceNumber) {
  if (!confirm('Mark this invoice as paid?')) return;
  
  try {
    const response = await fetch(`/api/invoices/${invoiceNumber}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'paid' })
    });
    
    const data = await parseJsonSafe(response);
    
    if (data.ok) {
      showToast('Invoice marked as paid');
      loadInvoices();
    } else {
      showToast('Failed to update invoice', true);
    }
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    showToast('Failed to update invoice', true);
  }
}

// Open edit invoice modal
async function openEditInvoice(invoiceNumber) {
  try {
    const response = await fetch(`/api/invoices/${invoiceNumber}`);
    const data = await response.json();
    if (!data.ok) { showToast('Failed to load invoice', true); return; }
    const inv = data.invoice;
    document.getElementById('editInvoiceNumber').value = inv.invoice_number;
    document.getElementById('editInvoiceTitle').textContent = `Edit Invoice #${inv.invoice_number}`;
    document.getElementById('editInvoiceSub').textContent = inv.customer_email || '';
    document.getElementById('editInvoiceStatus').value = inv.status || 'pending';
    document.getElementById('editInvoiceLockbox').value = inv.lockbox_code || '';
    document.getElementById('editInvoiceNotes').value = inv.admin_notes || '';
    document.getElementById('editInvoiceModal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading invoice:', error);
    showToast('Failed to load invoice', true);
  }
}

// Delete invoice
async function deleteInvoice(invoiceNumber) {
  if (!confirm('Delete this invoice? This cannot be undone.')) return;
  try {
    const response = await fetch(`/api/invoices/${invoiceNumber}`, { method: 'DELETE' });
    const data = await parseJsonSafe(response);
    if (data.ok) {
      showToast('Invoice deleted');
      loadInvoices();
    } else {
      showToast('Failed to delete invoice', true);
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    showToast('Failed to delete invoice', true);
  }
}

// Product management
async function loadProducts() {
  try {
    const response = await fetch('/api/products/admin');
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Failed to load products:', data.error);
      return;
    }
    
    renderProductsTable(data.products);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProductsTable(products) {
  const container = document.getElementById('productsTable');
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = '<p class="text-muted">No products found</p>';
    return;
  }
  
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(product => `
          <tr>
            <td>
              <div><strong>${product.name}</strong></div>
              <small class="text-muted">${product.description || ''}</small>
            </td>
            <td><span class="badge-pill">${product.category}</span></td>
            <td>$${product.price}</td>
            <td>
              <span class="badge-pill ${product.is_active ? 'status-pill status-paid' : 'status-pill status-cancelled'}">${product.is_active ? 'Active' : 'Inactive'}</span>
            </td>
            <td>
              <button class="cta secondary cta-sm" onclick="editProduct('${product._id}')">Edit</button>
              <button class="cta danger cta-sm" onclick="deleteProduct('${product._id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function editProduct(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();
    
    if (!data.ok) {
      alert('Failed to load product');
      return;
    }
    
    const product = data.product;
    
    // Populate form
    document.getElementById('editProductId').value = product._id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductQuantity').value = product.available_quantity;
    document.getElementById('editProductMaxOrder').value = product.max_quantity_per_order;
    document.getElementById('editProductInstructions').value = product.instructions || '';
    document.getElementById('editProductImage').value = product.image_url || '';
    document.getElementById('editProductActive').checked = product.is_active;
    
    // Show modal
    document.getElementById('editProductModal').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading product:', error);
    alert('Failed to load product details');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showToast('Product deleted successfully');
      loadProducts();
    } else {
      showToast('Failed to delete product', true);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast('Failed to delete product', true);
  }
}

function setupEventListeners() {
  // Add product button
  document.getElementById('addProductBtn').addEventListener('click', function() {
    document.getElementById('addProductModal').classList.remove('hidden');
  });
  
  // Add product form
  document.getElementById('addProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('productName').value,
      description: document.getElementById('productDescription').value,
      category: document.getElementById('productCategory').value,
      price: Number(document.getElementById('productPrice').value),
      available_quantity: Number(document.getElementById('productQuantity').value),
      max_quantity_per_order: Number(document.getElementById('productMaxOrder').value),
      instructions: document.getElementById('productInstructions').value,
      image_url: document.getElementById('productImage').value,
      is_active: document.getElementById('productActive').checked
    };
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.ok) {
        showToast('Product added successfully');
        document.getElementById('addProductModal').classList.add('hidden');
        document.getElementById('addProductForm').reset();
        loadProducts();
      } else {
        showToast('Failed to add product: ' + data.error, true);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Failed to add product', true);
    }
  });
  
  // Edit product form
  document.getElementById('editProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = {
      name: document.getElementById('editProductName').value,
      description: document.getElementById('editProductDescription').value,
      category: document.getElementById('editProductCategory').value,
      price: Number(document.getElementById('editProductPrice').value),
      available_quantity: Number(document.getElementById('editProductQuantity').value),
      max_quantity_per_order: Number(document.getElementById('editProductMaxOrder').value),
      instructions: document.getElementById('editProductInstructions').value,
      image_url: document.getElementById('editProductImage').value,
      is_active: document.getElementById('editProductActive').checked
    };
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.ok) {
        showToast('Product updated successfully');
        document.getElementById('editProductModal').classList.add('hidden');
        loadProducts();
      } else {
        showToast('Failed to update product: ' + data.error, true);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Failed to update product', true);
    }
  });
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
      });
    });
  });
  
  // Logout
  document.getElementById('logout').addEventListener('click', async function() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    location.href = '/login.html';
  });
}

function showToast(message, isError = false) {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = 'position-fixed top-0 end-0 p-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="toast show" role="alert">
      <div class="toast-header ${isError ? 'bg-danger text-white' : 'bg-success text-white'}">
        <strong class="me-auto">Admin</strong>
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
  }, 3000);
} 