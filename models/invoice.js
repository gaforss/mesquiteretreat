import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  // Customer information
  customer_email: { type: String, required: true, index: true },
  customer_name: String,
  customer_phone: String,
  
  // Invoice details
  invoice_number: { type: String, unique: true, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'cancelled', 'expired'], 
    default: 'pending' 
  },
  total_amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  
  // Items purchased
  items: [{
    name: { type: String, required: true },
    description: String,
    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, required: true },
    total_price: { type: Number, required: true }
  }],
  
  // Payment information
  payment_method: String,
  payment_date: Date,
  payment_reference: String,
  
  // Access information
  lockbox_code: { type: String, index: true },
  access_instructions: String,
  access_expires_at: Date,
  
  // Guest stay information
  check_in_date: Date,
  check_out_date: Date,
  reservation_id: String,
  
  // Admin notes
  admin_notes: String,
  
  // Timestamps
  expires_at: { type: Date, required: true },
  paid_at: Date,
  cancelled_at: Date,
  
  // Tracking
  ip_address: String,
  user_agent: String,
  utm_source: String,
  utm_medium: String,
  utm_campaign: String
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Generate unique invoice number
invoiceSchema.pre('validate', function(next) {
  if (!this.invoice_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.invoice_number = `INV-${year}${month}${day}-${random}`;
  }
  next();
});

// Generate lockbox code
invoiceSchema.pre('save', function(next) {
  if (this.status === 'paid' && !this.lockbox_code) {
    // Generate a 4-digit code
    this.lockbox_code = Math.floor(1000 + Math.random() * 9000).toString();
    // Set access to expire 24 hours after check-out date or 7 days from now
    const expiryDate = this.check_out_date ? 
      new Date(this.check_out_date.getTime() + 24 * 60 * 60 * 1000) : 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.access_expires_at = expiryDate;
  }
  next();
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema, 'invoices');

export default Invoice; 