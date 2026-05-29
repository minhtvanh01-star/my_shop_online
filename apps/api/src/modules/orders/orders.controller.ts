import { NextFunction, Request, Response } from 'express';
import { created, ok, paginated } from '../../utils/response';
import {
  AdminOrderListQuery,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
} from './orders.schema';
import * as OrdersService from './orders.service';

export async function getUserOrdersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await OrdersService.getUserOrders(req.user!.id, page, limit);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await OrdersService.getOrderById(req.params.id, req.user!.id);
    ok(res, order);
  } catch (err) {
    next(err);
  }
}

export async function createOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateOrderSchema.parse(req.body);
    const order = await OrdersService.createOrderFromCart(req.user!.id, dto);
    created(res, order);
  } catch (err) {
    next(err);
  }
}

export async function cancelOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await OrdersService.cancelOrder(req.params.id, req.user!.id);
    ok(res, { message: 'Order cancelled' });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrdersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = AdminOrderListQuery.parse(req.query);
    const result = await OrdersService.getAdminOrders(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateOrderStatusSchema.parse(req.body);
    const order = await OrdersService.updateOrderStatus(req.params.id, dto, req.user!.id);
    ok(res, order);
  } catch (err) {
    next(err);
  }
}
