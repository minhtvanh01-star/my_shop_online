import { NextFunction, Request, Response } from 'express';
import { created, ok, paginated } from '../../utils/response';
import { CouponListQuery, CreateCouponSchema, UpdateCouponSchema } from './coupons.schema';
import * as CouponsService from './coupons.service';

export async function listCouponsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = CouponListQuery.parse(req.query);
    const result = await CouponsService.listCoupons(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function createCouponHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateCouponSchema.parse(req.body);
    const coupon = await CouponsService.createCoupon(dto, req.user!.id);
    created(res, coupon);
  } catch (err) {
    next(err);
  }
}

export async function updateCouponHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateCouponSchema.parse(req.body);
    const coupon = await CouponsService.updateCoupon(req.params.id, dto, req.user!.id);
    ok(res, coupon);
  } catch (err) {
    next(err);
  }
}

export async function deleteCouponHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await CouponsService.deleteCoupon(req.params.id, req.user!.id);
    ok(res, { message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}
