import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  draw_date: { type: Date },
  notes: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema, 'promotions');
export default Promotion;

