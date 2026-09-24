import { ReviewStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  ApproveReviewDto,
  CreateReviewDto,
  ListReviewsQueryDto,
  ProductReviewQueryDto,
  UpdateReviewDto,
} from './reviews.schema';

const REVIEW_SELECT = {
  id: true,
  productId: true,
  userId: true,
  orderItemId: true,
  rating: true,
  title: true,
  body: true,
  isVerifiedPurchase: true,
  status: true,
  helpfulCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, fullName: true } },
} as const;

async function findDeliveredOrderItem(productId: string, userId: string, orderItemId?: string) {
  if (orderItemId) {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        productId: true,
        order: { select: { userId: true, status: true } },
      },
    });
    if (!orderItem) {
      throw new AppError(400, 'Order item not found', 'REVIEW_NOT_ALLOWED');
    }
    if (orderItem.order.userId !== userId) {
      throw new AppError(403, 'You do not own this order', 'FORBIDDEN');
    }
    if (orderItem.order.status !== 'delivered') {
      throw new AppError(
        400,
        'You can only review products from delivered orders',
        'REVIEW_NOT_ALLOWED',
      );
    }
    if (orderItem.productId !== productId) {
      throw new AppError(400, 'Order item does not match the product', 'REVIEW_NOT_ALLOWED');
    }
    return orderItem;
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: 'delivered' },
    },
    select: {
      id: true,
      productId: true,
      order: { select: { userId: true, status: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  });

  if (!orderItem) {
    throw new AppError(
      400,
      'You can only review products from delivered orders',
      'REVIEW_NOT_ALLOWED',
    );
  }
  return orderItem;
}

export async function listApprovedReviews(query: ListReviewsQueryDto) {
  const { productId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = { productId, status: ReviewStatus.approved };

  const [total, items] = await Promise.all([
    prisma.productReview.count({ where }),
    prisma.productReview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: REVIEW_SELECT,
    }),
  ]);

  return { items, total, page, limit };
}

export async function getReviewSummary(query: ProductReviewQueryDto) {
  const { productId } = query;
  const where = { productId, status: ReviewStatus.approved };

  const [total, grouped] = await Promise.all([
    prisma.productReview.count({ where }),
    prisma.productReview.groupBy({
      by: ['rating'],
      where,
      _count: { rating: true },
    }),
  ]);

  const counts = [0, 0, 0, 0, 0, 0];
  let sum = 0;
  for (const row of grouped) {
    if (row.rating >= 1 && row.rating <= 5) {
      counts[row.rating] += row._count.rating;
      sum += row.rating * row._count.rating;
    }
  }

  return {
    productId,
    count: total,
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    counts: { 1: counts[1], 2: counts[2], 3: counts[3], 4: counts[4], 5: counts[5] },
  };
}

export async function getMyReviewForProduct(query: ProductReviewQueryDto, userId: string) {
  const { productId } = query;

  const [review, deliveredItem] = await Promise.all([
    prisma.productReview.findFirst({
      where: { productId, userId },
      select: REVIEW_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: 'delivered' } },
      select: { id: true },
    }),
  ]);

  return {
    review,
    canReview: Boolean(deliveredItem) && !review,
    canEdit: Boolean(review),
    eligibleOrderItemId: deliveredItem?.id ?? null,
  };
}

export async function createReview(dto: CreateReviewDto, userId: string) {
  const { productId, orderItemId, rating, title, body } = dto;

  const orderItem = await findDeliveredOrderItem(productId, userId, orderItemId);

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const existing = await prisma.productReview.findFirst({
    where: { productId, userId },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, 'You already reviewed this product', 'REVIEW_EXISTS');
  }

  return prisma.productReview.create({
    data: {
      productId,
      userId,
      orderItemId: orderItem.id,
      rating,
      title,
      body,
      isVerifiedPurchase: true,
      status: ReviewStatus.approved,
    },
    select: REVIEW_SELECT,
  });
}

export async function updateReview(id: string, dto: UpdateReviewDto, userId: string) {
  const review = await prisma.productReview.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }

  if (review.userId !== userId) {
    throw new AppError(403, 'You do not own this review', 'FORBIDDEN');
  }

  return prisma.productReview.update({
    where: { id },
    data: {
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.body !== undefined && { body: dto.body }),
      status: ReviewStatus.approved,
    },
    select: REVIEW_SELECT,
  });
}

export async function deleteReview(id: string, userId: string) {
  const review = await prisma.productReview.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }

  if (review.userId !== userId) {
    throw new AppError(403, 'You do not own this review', 'FORBIDDEN');
  }

  await prisma.productReview.delete({ where: { id } });
}

export async function approveReview(id: string, dto: ApproveReviewDto, reviewedBy: string) {
  const review = await prisma.productReview.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }

  const status =
    dto.status === 'approved' ? ReviewStatus.approved : ReviewStatus.rejected;

  return prisma.productReview.update({
    where: { id },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      rejectedReason: dto.status === 'rejected' ? (dto.rejectedReason ?? null) : null,
    },
    select: { ...REVIEW_SELECT, reviewedBy: true, reviewedAt: true, rejectedReason: true },
  });
}
