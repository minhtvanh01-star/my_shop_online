import { NextFunction, Request, Response } from 'express';
import { created, ok, paginated } from '../../utils/response';
import {
  AdminOrderListQuery,
  CancelOrderSchema,
  CreateOrderSchema,
  CreateReturnRequestSchema,
  ReviewReturnRequestSchema,
  UpdateOrderStatusSchema,
  UserOrderListQuery,
} from './orders.schema';
import * as OrdersService from './orders.service';

export async function getUserOrdersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = UserOrderListQuery.parse(req.query);
    const result = await OrdersService.getUserOrders(req.user!.id, query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await OrdersService.getOrderById(req.params.id, req.user!.id, req.user!.role);
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
    const dto = CancelOrderSchema.parse(req.body ?? {});
    await OrdersService.cancelOrder(req.params.id, req.user!.id, req.user!.role, dto.reason);
    ok(res, { message: 'Order cancelled' });
  } catch (err) {
    next(err);
  }
}

export async function createReturnRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateReturnRequestSchema.parse(req.body);
    const result = await OrdersService.createReturnRequest(req.params.id, req.user!.id, dto);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function reviewReturnRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = ReviewReturnRequestSchema.parse(req.body);
    const result = await OrdersService.reviewReturnRequest(
      req.params.id,
      req.params.returnId,
      dto,
      req.user!.id,
      req.user!.role,
    );
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrdersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = AdminOrderListQuery.parse(req.query);
    const result = await OrdersService.getAdminOrders(query, req.user!.role);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateOrderStatusSchema.parse(req.body);
    const order = await OrdersService.updateOrderStatus(req.params.id, dto, req.user!.id, req.user!.role);
    ok(res, order);
  } catch (err) {
    next(err);
  }
}
