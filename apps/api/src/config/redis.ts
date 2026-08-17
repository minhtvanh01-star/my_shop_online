import Redis from 'ioredis';
import { env } from './env';

type RedisClient = {
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  quit(): Promise<'OK'>;
  connect(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
};

function createMemoryRedis(): RedisClient {
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  function purge(key: string) {
    const row = store.get(key);
    if (!row) return;
    if (row.expiresAt !== null && row.expiresAt <= Date.now()) store.delete(key);
  }

  return {
    async setex(key, seconds, value) {
      store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      return 'OK';
    },
    async get(key) {
      purge(key);
      return store.get(key)?.value ?? null;
    },
    async del(...keys) {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key)) removed += 1;
      }
      return removed;
    },
    async quit() {
      store.clear();
      return 'OK';
    },
    async connect() {
      /* no-op */
    },
    on() {
      return this;
    },
  };
}

function useMemoryRedis(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  return (
    normalized === 'memory' ||
    normalized === 'memory://' ||
    normalized.startsWith('memory://') ||
    normalized === 'inmemory'
  );
}

const memoryMode = useMemoryRedis(env.REDIS_URL);

export const redis: RedisClient = memoryMode
  ? createMemoryRedis()
  : (new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    }) as unknown as RedisClient);

if (!memoryMode) {
  (redis as Redis).on('error', (err: Error) => {
    console.error('Redis error:', err.message);
  });
  (redis as Redis).on('reconnecting', () => {
    console.warn('Redis reconnecting...');
  });
}

export async function connectRedis(): Promise<void> {
  try {
    if (memoryMode) {
      await redis.connect();
      console.log('✅ Redis connected (in-memory, no Docker — local only)');
      return;
    }
    await redis.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.error(
      'Hint: set REDIS_URL=memory in apps/api/.env for local without Docker, or install Memurai (Windows Redis) and use redis://localhost:6379',
    );
    process.exit(1);
  }
}
