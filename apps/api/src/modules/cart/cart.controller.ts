import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { AddCartItemSchema, UpdateCartItemSchema } from './cart.schema';
import * as CartService from './cart.service';

export async function getCartHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await CartService.getCart(req.user!.id);
    ok(res, items);
  } catch (err) {
    next(err);
  }
}

export async function addItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = AddCartItemSchema.parse(req.body);
    const item = await CartService.addItem(req.user!.id, dto);
    ok(res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateCartItemSchema.parse(req.body);
    const item = await CartService.updateItem(req.user!.id, req.params.itemId, dto);
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
