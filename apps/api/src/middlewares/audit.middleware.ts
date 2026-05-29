import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';

export function auditLog(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.on('finish', async () => {
      if (!req.user || res.statusCode >= 400) return;
      try {
        await prisma.auditLog.create({
          data: {
            actorId: req.user.id,
            actorType: req.user.role,
            action,
            resourceType,
            resourceId: req.params.id ?? null,
            ipAddress: req.ip ?? '',
            userAgent: req.headers['user-agent'] ?? '',
          },
        });
      } catch {
        // Non-critical: don't break the request
      }
    });
    next();
  };
}
