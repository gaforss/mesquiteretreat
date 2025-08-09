import rateLimit from 'express-rate-limit';

export const subscribeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
export const adminLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 200 });

