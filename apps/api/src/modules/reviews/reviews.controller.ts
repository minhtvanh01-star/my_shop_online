import { NextFunction, Request, Response } from 'express';
import { ok, created, paginated } from '../../utils/response';
import {
  ListReviewsQuerySchema,
  CreateReviewSchema,
  UpdateReviewSchema,
  ApproveReviewSchema,
} from './reviews.schema';
import * as ReviewService from './reviews.service';

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

export async function createReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = CreateReviewSchema.parse(req.body);
    const review = await ReviewService.createReview(dto, req.user!.id);
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
    const review = await ReviewService.updateReview(req.params.id, dto, req.user!.id);
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
    await ReviewService.deleteReview(req.params.id, req.user!.id);
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
    const review = await ReviewService.approveReview(req.params.id, dto, req.user!.id);
    ok(res, review);
  } catch (err) {
    next(err);
  }
}
