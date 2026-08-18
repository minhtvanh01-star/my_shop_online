import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { invalidateFeatureCache } from '../../utils/features';
import { invalidateShopConfigCache } from '../../utils/shop-config';
import type { ToggleFeatureDto, UpdateSettingDto } from './settings.schema';

const ENCRYPTED_PLACEHOLDER = '***';

export async function getPublicSettings() {
  const configs = await prisma.systemConfig.findMany({
    where: { isPublic: true, isActive: true },
    select: {
      id: true,
      key: true,
      value: true,
      dataType: true,
      group: true,
      description: true,
      isEncrypted: true,
    },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });

  return configs.map((c) => ({
    ...c,
    value: c.isEncrypted ? ENCRYPTED_PLACEHOLDER : c.value,
  }));
}

export async function getAllSettings() {
  const configs = await prisma.systemConfig.findMany({
    where: { isActive: true },
    select: {
      id: true,
      key: true,
      value: true,
      dataType: true,
      group: true,
      description: true,
      isPublic: true,
      isEncrypted: true,
      isActive: true,
      updatedAt: true,
    },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });

  return configs.map((c) => ({
    ...c,
    value: c.isEncrypted ? ENCRYPTED_PLACEHOLDER : c.value,
  }));
}

export async function updateSetting(key: string, dto: UpdateSettingDto, actorId: string) {
  const existing = await prisma.systemConfig.findUnique({
    where: { key },
    select: { id: true, isActive: true },
  });

  if (!existing || !existing.isActive) {
    throw new AppError(404, 'Setting not found', 'SETTING_NOT_FOUND');
  }

  const result = await prisma.systemConfig.update({
    where: { key },
    data: {
      value: dto.value,
      updatedBy: actorId,
    },
    select: {
      id: true,
      key: true,
      dataType: true,
      group: true,
      description: true,
      isPublic: true,
      isEncrypted: true,
      isActive: true,
      updatedAt: true,
    },
  });
  invalidateShopConfigCache();
  return result;
}

export async function getActiveFeatureFlags() {
  return prisma.featureFlag.findMany({
    where: {},
    select: {
      id: true,
      key: true,
      isEnabled: true,
      description: true,
      updatedAt: true,
    },
    orderBy: { key: 'asc' },
  });
}

export async function toggleFeatureFlag(key: string, actorId: string, dto?: ToggleFeatureDto) {
  const existing = await prisma.featureFlag.findUnique({
    where: { key },
    select: { id: true, isEnabled: true },
  });

  if (!existing) {
    throw new AppError(404, 'Feature flag not found', 'FEATURE_NOT_FOUND');
  }

  const result = await prisma.featureFlag.update({
    where: { key },
    data: {
      isEnabled: dto?.isEnabled ?? !existing.isEnabled,
      updatedBy: actorId,
    },
    select: {
      id: true,
      key: true,
      isEnabled: true,
      description: true,
      updatedAt: true,
    },
  });
  invalidateFeatureCache();
  return result;
}
