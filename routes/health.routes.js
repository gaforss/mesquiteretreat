import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (_req,res)=>res.json({ok:true}));

router.get('/mongo-status', (_req, res) => {
  const state = mongoose.connection?.readyState;
  const statesMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ ok:true, state, stateText: statesMap[state] || 'unknown', db: mongoose.connection?.name || null });
});

export default router;

