import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['golf', 'beach', 'outdoor', 'kitchen', 'entertainment', 'other'],
    default: 'other'
  },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  available_quantity: { type: Number, default: 1 },
  max_quantity_per_order: { type: Number, default: 1 },
  
  // Product details
  image_url: String,
  specifications: Object,
  instructions: String,
  
  // Availability
  is_active: { type: Boolean, default: true },
  requires_advance_notice_hours: { type: Number, default: 24 },
  
  // Admin settings
  admin_notes: String,
  sort_order: { type: Number, default: 0 }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema, 'products');

export default Product; 