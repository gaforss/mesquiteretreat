import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  company: { type: String, default: '' },
  password_hash: { type: String, required: true },
  vendor_code: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['active','suspended'], default: 'active' },
  must_change_password: { type: Boolean, default: true },
  reset_token: { type: String, index: true },
  reset_token_expiry: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema, 'vendors');

export default Vendor;

