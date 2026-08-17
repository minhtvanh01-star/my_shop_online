import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from './coupons.schema';

const couponSelect = {
  id: true,
  code: true,
  type: true,
  value: true,
  minOrderAmount: true,
  maxUses: true,
  usedCount: true,
  perUserLimit: true,
  applicableCountries: true,
  startDate: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listCoupons(query: CouponListQueryDto) {
  const { page, limit, search, isActive } = query;
  const skip = (page - 1) * limit;
  const where = {
    deletedAt: null as null,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search ? { code: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: couponSelect,
    }),
  ]);

  return { items, total, page, limit };
}

export async function createCoupon(dto: CreateCouponDto, actorId: string) {
  const existing = await prisma.coupon.findFirst({ where: { code: dto.code } });
  if (existing) throw new AppError(409, 'Coupon code already exists', 'COUPON_CONFLICT');

  return prisma.coupon.create({
    data: {
      ...dto,
      createdBy: actorId,
    },
    select: couponSelect,
  });
}

export async function updateCoupon(id: string, dto: UpdateCouponDto, actorId: string) {
  const coupon = await prisma.coupon.findFirst({ where: { id, deletedAt: null } });
  if (!coupon) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');

  if (dto.code && dto.code !== coupon.code) {
    const conflict = await prisma.coupon.findFirst({ where: { code: dto.code, id: { not: id } } });
    if (conflict) throw new AppError(409, 'Coupon code already exists', 'COUPON_CONFLICT');
  }

  return prisma.coupon.update({
    where: { id },
    data: { ...dto, updatedBy: actorId },
    select: couponSelect,
  });
}

export async function deleteCoupon(id: string, actorId: string) {
  const coupon = await prisma.coupon.findFirst({ where: { id, deletedAt: null } });
  if (!coupon) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');

  await prisma.coupon.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: actorId, isActive: false },
  });
}
