import { parseShopSettings, SHOP_SETTINGS_DEFAULTS, type ShopSettings } from '@/lib/shop-settings';
import { serverGet } from '@/lib/server-api';

type PublicSetting = { key: string; value: string | null };
type FeatureFlag = { key: string; isEnabled: boolean };

export async function loadPublicShopSettings(): Promise<ShopSettings> {
  try {
    const [rows, flags] = await Promise.all([
      serverGet<PublicSetting[]>('/settings'),
      serverGet<FeatureFlag[]>('/settings/features'),
    ]);
    return parseShopSettings(rows, flags);
  } catch {
    return SHOP_SETTINGS_DEFAULTS;
  }
}
