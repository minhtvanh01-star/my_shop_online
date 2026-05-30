import { NextFunction, Request, Response } from 'express';
import { ok, paginated } from '../../utils/response';
import { AdminUsersQuerySchema, AuditLogsQuerySchema } from './admin.schema';
import * as AdminService from './admin.service';

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await AdminService.getDashboardStats();
    ok(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = AdminUsersQuerySchema.parse(req.query);
    const { users, total, page, limit } = await AdminService.listUsers(query);
    paginated(res, users, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = AuditLogsQuerySchema.parse(req.query);
    const { logs, total, page, limit } = await AdminService.listAuditLogs(query);
    paginated(res, logs, { page, limit, total });
  } catch (err) {
    next(err);
  }
}
