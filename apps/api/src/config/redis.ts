import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('reconnecting', () => {
  console.warn('Redis reconnecting...');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
}
