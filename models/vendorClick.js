import mongoose from 'mongoose';

const vendorClickSchema = new mongoose.Schema({
  vendor_code: { type: String, index: true },
  type: { type: String, default: 'landing' },
  ip: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const VendorClick = mongoose.models.VendorClick || mongoose.model('VendorClick', vendorClickSchema, 'vendor_clicks');

export default VendorClick;

