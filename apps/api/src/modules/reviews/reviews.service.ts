import { ReviewStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  ApproveReviewDto,
  CreateReviewDto,
  ListReviewsQueryDto,
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

export async function createReview(dto: CreateReviewDto, userId: string) {
  const { productId, orderItemId, rating, title, body } = dto;

  // Validate the order item belongs to a delivered order for this user (BR-U05)
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

  // Check product exists
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  return prisma.productReview.create({
    data: {
      productId,
      userId,
      orderItemId,
      rating,
      title,
      body,
      isVerifiedPurchase: true,
      status: ReviewStatus.pending,
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
      // Reset to pending after edit
      status: ReviewStatus.pending,
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
