import type { NextFunction, Request, Response } from 'express';
import { getShopConfig } from '../utils/shop-config';

type Hit = { count: number; resetAt: number };

const hits = new Map<string, Hit>();
let lastPrune = Date.now();

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function isPaymentWebhookPath(url: string): boolean {
  return url.includes('/payments/stripe/webhook') || url.includes('/payments/vnpay/ipn');
}

function prune(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, row] of hits) {
    if (row.resetAt <= now) hits.delete(key);
  }
}

export async function shopRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const url = req.originalUrl || req.url || '';
  if (isPaymentWebhookPath(url) || url === '/health') {
    next();
    return;
  }

  try {
    const config = await getShopConfig();
    const now = Date.now();
    prune(now);
    const windowMs = Math.max(1, config.rateLimitWindowMin) * 60 * 1000;
    const key = clientKey(req);
    let row = hits.get(key);
    if (!row || row.resetAt <= now) {
      row = { count: 0, resetAt: now + windowMs };
      hits.set(key, row);
    }
    row.count += 1;
    res.setHeader('X-RateLimit-Limit', String(config.rateLimitMax));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, config.rateLimitMax - row.count)));
    if (row.count > config.rateLimitMax) {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
      return;
    }
    next();
  } catch {
    next();
  }
}
