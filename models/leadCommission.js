import mongoose from 'mongoose';

const leadCommissionSchema = new mongoose.Schema({
  vendor_id: { type: String, index: true, required: true },
  vendor_code: { type: String, index: true, required: true },
  vendor_email: { type: String, required: true },
  vendor_name: { type: String, default: '' },
  subscriber_id: { type: String, index: true }, // Link to subscriber who was referred
  subscriber_email: { type: String },
  lead_type: { type: String, enum: ['click', 'conversion', 'booking', 'inquiry'], default: 'click' },
  commission_type: { type: String, enum: ['percentage', 'fixed', 'lead'], default: 'lead' },
  commission_amount: { type: Number, required: true, min: 0 }, // Amount YOU earn from vendor
  commission_percent: { type: Number, min: 0, max: 100 }, // Percentage if applicable
  lead_price: { type: Number, min: 0 }, // Fixed price per lead
  transaction_amount: { type: Number, min: 0 }, // Total transaction amount (if conversion)
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
  vendor_approval_date: { type: Date },
  vendor_notes: { type: String, default: '' },
  admin_notes: { type: String, default: '' },
  email_sent: { type: Boolean, default: false },
  email_sent_date: { type: Date },
  vendor_response: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  vendor_response_date: { type: Date },
  vendor_response_notes: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const LeadCommission = mongoose.models.LeadCommission || mongoose.model('LeadCommission', leadCommissionSchema, 'lead_commissions');

export default LeadCommission; 