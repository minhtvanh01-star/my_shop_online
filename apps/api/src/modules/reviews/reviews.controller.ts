import { NextFunction, Request, Response } from 'express';
import { ok, created, paginated } from '../../utils/response';
import { AppError } from '../../middlewares/error.middleware';
import {
  ListReviewsQuerySchema,
  CreateReviewSchema,
  UpdateReviewSchema,
  ApproveReviewSchema,
  ProductReviewQuerySchema,
} from './reviews.schema';
import * as ReviewService from './reviews.service';

function actorId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return req.user.id;
}

export async function listReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ListReviewsQuerySchema.parse(req.query);
    const result = await ReviewService.listApprovedReviews(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function reviewSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ProductReviewQuerySchema.parse(req.query);
    const summary = await ReviewService.getReviewSummary(query);
    ok(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function myReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ProductReviewQuerySchema.parse(req.query);
    const result = await ReviewService.getMyReviewForProduct(query, actorId(req));
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function createReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = CreateReviewSchema.parse(req.body);
    const review = await ReviewService.createReview(dto, actorId(req));
    created(res, review);
  } catch (err) {
    next(err);
  }
}

export async function updateReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = UpdateReviewSchema.parse(req.body);
    const review = await ReviewService.updateReview(req.params.id, dto, actorId(req));
    ok(res, review);
  } catch (err) {
    next(err);
  }
}

export async function deleteReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await ReviewService.deleteReview(req.params.id, actorId(req));
    ok(res, { message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
}

export async function approveReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = ApproveReviewSchema.parse(req.body);
    const review = await ReviewService.approveReview(req.params.id, dto, actorId(req));
    ok(res, review);
  } catch (err) {
    next(err);
  }
}
