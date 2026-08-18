import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';

export const FEATURE_KEYS = {
  reviews: 'feature.review_system',
  wishlist: 'feature.wishlist',
  blog: 'feature.blog',
  coupon: 'feature.coupon',
  multiCurrency: 'feature.multi_currency',
} as const;

const DEFAULT_FLAGS: Record<string, boolean> = {
  [FEATURE_KEYS.reviews]: true,
  [FEATURE_KEYS.wishlist]: true,
  [FEATURE_KEYS.blog]: true,
  [FEATURE_KEYS.coupon]: false,
  [FEATURE_KEYS.multiCurrency]: false,
};

let cache: { value: Record<string, boolean>; expiresAt: number } | null = null;
const CACHE_MS = 10_000;

export function invalidateFeatureCache(): void {
  cache = null;
}

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const rows = await prisma.featureFlag.findMany({ select: { key: true, isEnabled: true } });
  const value = { ...DEFAULT_FLAGS };
  for (const row of rows) value[row.key] = row.isEnabled;
  cache = { value, expiresAt: now + CACHE_MS };
  return value;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key] === true;
}

export async function assertFeatureEnabled(key: string): Promise<void> {
  if (!(await isFeatureEnabled(key))) {
    throw new AppError(403, 'This feature is disabled', 'FEATURE_DISABLED');
  }
}
