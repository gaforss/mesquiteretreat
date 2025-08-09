import mongoose from 'mongoose';

const drawSchema = new mongoose.Schema({
  criteria: Object,
  winner_email: String,
  winner_id: String,
  eligible_count: Number,
  promotion_id: String,
  created_at: { type: Date, default: Date.now }
});

const Draw = mongoose.models.Draw || mongoose.model('Draw', drawSchema, 'draws');

export default Draw;

