import mongoose from 'mongoose';

const vendorOfferingSchema = new mongoose.Schema({
  vendor_id: { type: String, index: true, required: true },
  vendor_code: { type: String, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, default: '' },
  price: { type: Number, default: null },
  active: { type: Boolean, default: true },
  // Discount fields specific to this property
  property_only: { type: Boolean, default: true },
  discount_code: { type: String, default: '' },
  discount_percent: { type: Number, default: null, min: 0, max: 100 },
  discount_text: { type: String, default: '' },
  image_url: { type: String, default: '' },
  logo_url: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const VendorOffering = mongoose.models.VendorOffering || mongoose.model('VendorOffering', vendorOfferingSchema, 'vendor_offerings');

export default VendorOffering;

