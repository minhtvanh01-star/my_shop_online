import { NextFunction, Request, Response } from 'express';
import { ok, created } from '../../utils/response';
import { AddToWishlistSchema, RemoveFromWishlistQuerySchema } from './wishlist.schema';
import * as WishlistService from './wishlist.service';

export async function getWishlistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await WishlistService.getWishlist(req.user!.id);
    ok(res, items);
  } catch (err) {
    next(err);
  }
}

export async function addToWishlistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = AddToWishlistSchema.parse(req.body);
    const item = await WishlistService.addToWishlist(req.user!.id, req.params.productId, dto);
    created(res, item);
  } catch (err) {
    next(err);
  }
}

export async function removeFromWishlistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = RemoveFromWishlistQuerySchema.parse(req.query);
    await WishlistService.removeFromWishlist(
      req.user!.id,
      req.params.productId,
      query.variantId,
    );
    ok(res, { message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
}
