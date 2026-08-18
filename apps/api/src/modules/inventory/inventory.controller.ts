import { NextFunction, Request, Response } from 'express';
import { ok, paginated } from '../../utils/response';
import {
  AdjustStockSchema,
  InventoryListQuery,
  InventoryTxQuery,
  UpsertStockAlertSchema,
} from './inventory.schema';
import * as InventoryService from './inventory.service';

export async function listStockItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = InventoryListQuery.parse(req.query);
    const result = await InventoryService.listStockItems(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function adjustStockHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = AdjustStockSchema.parse(req.body);
    const result = await InventoryService.adjustStock(dto, req.user!.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function upsertStockAlertHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpsertStockAlertSchema.parse(req.body);
    const result = await InventoryService.upsertStockAlert(dto, req.user!.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listTransactionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = InventoryTxQuery.parse(req.query);
    const result = await InventoryService.listTransactions(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}
