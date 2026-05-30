import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  ChangePasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './users.schema';

const userSafeSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  locale: true,
  countryCode: true,
  isVerified: true,
  isActive: true,
  createdAt: true,
};

const addressSelect = {
  id: true,
  label: true,
  recipientName: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  countryCode: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: userSafeSelect,
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
}

export async function updateProfile(userId: string, dto: UpdateProfileDto) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

  return prisma.user.update({
    where: { id: userId },
    data: dto,
    select: userSafeSelect,
  });
}

export async function changePassword(userId: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

  if (!user.passwordHash) {
    throw new AppError(400, 'Password not set for this account', 'NO_PASSWORD');
  }

  const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
  }

  const newHash = await bcrypt.hash(dto.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function listAddresses(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId, isActive: true },
    select: addressSelect,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function createAddress(userId: string, dto: CreateAddressDto) {
  if (dto.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.userAddress.create({
        data: { ...dto, userId },
        select: addressSelect,
      });
    });
  }

  return prisma.userAddress.create({
    data: { ...dto, userId },
    select: addressSelect,
  });
}

export async function updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
  const address = await prisma.userAddress.findUnique({
    where: { id: addressId },
    select: { id: true, userId: true },
  });
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
  if (address.userId !== userId) throw new AppError(403, 'Access denied', 'FORBIDDEN');

  if (dto.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.userAddress.update({
        where: { id: addressId },
        data: dto,
        select: addressSelect,
      });
    });
  }

  return prisma.userAddress.update({
    where: { id: addressId },
    data: dto,
    select: addressSelect,
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.userAddress.findUnique({
    where: { id: addressId },
    select: { id: true, userId: true },
  });
  if (!address) throw new AppError(404, 'Address not found', 'ADDRESS_NOT_FOUND');
  if (address.userId !== userId) throw new AppError(403, 'Access denied', 'FORBIDDEN');

  await prisma.userAddress.update({
    where: { id: addressId },
    data: { isActive: false },
  });
}
