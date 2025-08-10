import mongoose from 'mongoose';

const vendorCommissionSchema = new mongoose.Schema({
  vendor_id: { type: String, index: true, required: true },
  vendor_code: { type: String, index: true, required: true },
  offering_id: { type: String, index: true },
  offering_title: { type: String, default: '' },
  commission_type: { type: String, enum: ['percentage', 'fixed', 'lead'], default: 'percentage' },
  commission_amount: { type: Number, required: true, min: 0 }, // The actual commission earned
  commission_percent: { type: Number, min: 0, max: 100 }, // Percentage if applicable
  lead_price: { type: Number, min: 0 }, // Fixed price if lead-based
  service_fee: { type: Number, min: 0 }, // Service fee if applicable
  transaction_amount: { type: Number, min: 0 }, // Total transaction amount
  transaction_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'confirmed', 'paid', 'cancelled'], default: 'pending' },
  notes: { type: String, default: '' },
  source: { type: String, enum: ['click', 'conversion', 'manual'], default: 'manual' },
  subscriber_id: { type: String, index: true }, // Link to subscriber if applicable
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const VendorCommission = mongoose.models.VendorCommission || mongoose.model('VendorCommission', vendorCommissionSchema, 'vendor_commissions');

export default VendorCommission; 