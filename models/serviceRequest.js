import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  offering_id: { type: String, index: true, required: true },
  vendor_code: { type: String, index: true },
  title: { type: String, default: '' },
  guest_name: { type: String, default: '' },
  guest_email: { type: String, default: '' },
  guest_phone: { type: String, default: '' },
  dates: { type: String, default: '' },
  notes: { type: String, default: '' },
  source: { type: String, default: 'network' },
  status: { type: String, enum: ['new','sent_to_vendor','accepted','fulfilled','canceled'], default: 'new' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema, 'service_requests');

export default ServiceRequest;

