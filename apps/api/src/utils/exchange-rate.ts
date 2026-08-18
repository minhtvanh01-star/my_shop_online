import { prisma } from '../config/database';
import { EXCHANGE_RATE_KEY, parseExchangeRate } from './exchange';

export async function getUsdToVndRate(): Promise<number> {
  const row = await prisma.systemConfig.findFirst({
    where: { key: EXCHANGE_RATE_KEY, isActive: true },
    select: { value: true },
  });
  return parseExchangeRate(row?.value);
}
