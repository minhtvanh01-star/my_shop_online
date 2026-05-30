import { prisma } from '../../config/database';
import type { AdminUsersQueryDto, AuditLogsQueryDto } from './admin.schema';

export async function getDashboardStats() {
  const [totalUsers, totalOrders, revenueResult, pendingOrders, totalProducts] =
    await prisma.$transaction([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'delivered' },
      }),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.product.count({ where: { deletedAt: null } }),
    ]);

  return {
    totalUsers,
    totalOrders,
    totalRevenue: revenueResult._sum.totalAmount ?? 0,
    pendingOrders,
    totalProducts,
  };
}

export async function listUsers(query: AdminUsersQueryDto) {
  const { page, limit, search, isActive } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null as null,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: { name: true },
            },
            isActive: true,
            expiresAt: true,
          },
          where: { isActive: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

export async function listAuditLogs(query: AuditLogsQueryDto) {
  const { page, limit, actorId, resourceType, action } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(actorId ? { actorId } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actorId: true,
        actorType: true,
        action: true,
        resourceType: true,
        resourceId: true,
        ipAddress: true,
        isSensitive: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}
