import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true, required: true },
  first_name: String,
  last_name: String,
  phone: String,
  consent: Boolean,
  consent_at: Date,
  consent_ip: String,
  city: String,
  region: String,
  country: String,
  country_code: String,
  utm: Object,
  ip: String,
  user_agent: String,
  trip_type: String,
  group_size: Number,
  travel_months: String,
  ig_handle: String,
  stars: { type: Number, default: 0 },
  tasks: Object,
  ref_code: { type: String, unique: true, sparse: true },
  referred_by: String,
  confirmed: { type: Boolean, default: false },
  // Admin / lifecycle fields
  discount_code: String,
  is_returning: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const collectionName = process.env.MONGODB_COLLECTION || 'subscribers';
const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema, collectionName);

export async function upsertSubscriberDoc(email, doc) {
  await Subscriber.updateOne({ email }, { $set: doc }, { upsert: true });
}

export async function confirmSubscriberByEmail(email) {
  await Subscriber.updateOne({ email }, { $set: { confirmed: true } });
}

export default Subscriber;

