import { NextFunction, Request, Response } from 'express';
import { writeAuditLog } from '../utils/audit';
import {
  attachAuditResponseCapture,
  captureAuditNewValue,
  resolveAuditResourceId,
  type AuditLogOptions,
} from '../utils/audit-log';

export function auditLog(action: string, resourceType: string, options?: AuditLogOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    attachAuditResponseCapture(res);
    res.on('finish', () => {
      if (!req.user || res.statusCode >= 400) return;
      const params = req.params as Record<string, string | undefined>;
      const resourceId = resolveAuditResourceId(
        params,
        req.body,
        res.locals.auditResourceId as string | undefined,
        options?.resourceIdParam,
      );
      void writeAuditLog({
        actorId: req.user.id,
        actorType: req.user.role,
        action,
        resourceType,
        resourceId,
        newValue: captureAuditNewValue(req, options),
        ipAddress: req.ip ?? '',
        userAgent: req.headers['user-agent'] ?? '',
        requestId: typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : null,
        isSensitive: options?.sensitive ?? false,
      });
    });
    next();
  };
}
