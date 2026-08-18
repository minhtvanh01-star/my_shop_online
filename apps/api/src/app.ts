import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import 'dotenv/config';
import express, { Application } from 'express';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, redis } from './config/redis';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/orders/orders.routes';
import paymentRoutes from './modules/payments/payments.routes';
import { stripeWebhookHandler } from './modules/payments/payments.controller';
import userRoutes from './modules/users/users.routes';
import categoryRoutes from './modules/categories/categories.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import blogRoutes from './modules/blog/blog.routes';
import pageRoutes from './modules/pages/pages.routes';
import mediaRoutes from './modules/media/media.routes';
import adminRoutes from './modules/admin/admin.routes';
import settingsRoutes from './modules/settings/settings.routes';
import couponRoutes from './modules/coupons/coupons.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';

const app: Application = express();
const V1 = '/api/v1';

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  }),
);

// ── Stripe webhook — raw body ONLY, before express.json() ────────────────────
app.post(
  `${V1}/payments/stripe/webhook`,
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
);

// ── Parsing & Utilities ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.resolve(process.cwd(), 'uploads')),
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(`${V1}/auth`, authRoutes);
app.use(`${V1}/products`, productRoutes);
app.use(`${V1}/cart`, cartRoutes);
app.use(`${V1}/orders`, orderRoutes);
app.use(`${V1}/payments`, paymentRoutes);
app.use(`${V1}/users`, userRoutes);
app.use(`${V1}/categories`, categoryRoutes);
app.use(`${V1}/reviews`, reviewRoutes);
app.use(`${V1}/wishlist`, wishlistRoutes);
app.use(`${V1}/blog`, blogRoutes);
app.use(`${V1}/pages`, pageRoutes);
app.use(`${V1}/media`, mediaRoutes);
app.use(`${V1}/admin`, adminRoutes);
app.use(`${V1}/settings`, settingsRoutes);
app.use(`${V1}/coupons`, couponRoutes);
app.use(`${V1}/inventory`, inventoryRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await connectDatabase();
  await connectRedis();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      await redis.quit();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
