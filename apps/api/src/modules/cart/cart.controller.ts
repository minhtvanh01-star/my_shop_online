import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { resolveLocale } from '../../utils/locale';
import { AddCartItemSchema, SyncCartSchema, UpdateCartItemSchema } from './cart.schema';
import * as CartService from './cart.service';

function localeOf(req: Request) {
  return resolveLocale(req.query.locale);
}

export async function getCartHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await CartService.getCart(req.user!.id, localeOf(req));
    ok(res, items);
  } catch (err) {
    next(err);
  }
}

export async function addItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = AddCartItemSchema.parse(req.body);
    const item = await CartService.addItem(req.user!.id, dto, localeOf(req));
    ok(res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateCartItemSchema.parse(req.body);
    const item = await CartService.updateItem(req.user!.id, req.params.itemId, dto, localeOf(req));
    ok(res, item);
  } catch (err) {
    next(err);
  }
}

export async function removeItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await CartService.removeItem(req.user!.id, req.params.itemId);
    ok(res, { message: 'Item removed' });
  } catch (err) {
    next(err);
  }
}

export async function clearCartHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await CartService.clearCart(req.user!.id);
    ok(res, { message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
}

export async function syncCartHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = SyncCartSchema.parse(req.body);
    const items = await CartService.syncCart(req.user!.id, dto, localeOf(req));
    ok(res, items);
  } catch (err) {
    next(err);
  }
}
