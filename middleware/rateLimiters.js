import rateLimit from 'express-rate-limit';

export const subscribeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 3 });
export const adminLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 200 });

