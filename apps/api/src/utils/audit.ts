import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redactAuditValue } from './audit-log';

export async function writeAuditLog(entry: {
  actorId?: string | null;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  isSensitive?: boolean;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? undefined,
        actorType: entry.actorType,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? undefined,
        oldValue:
          entry.oldValue === undefined
            ? undefined
            : (redactAuditValue(entry.oldValue) as Prisma.InputJsonValue),
        newValue:
          entry.newValue === undefined
            ? undefined
            : (redactAuditValue(entry.newValue) as Prisma.InputJsonValue),
        ipAddress: entry.ipAddress ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        requestId: entry.requestId ?? undefined,
        isSensitive: entry.isSensitive ?? false,
      },
    });
  } catch {
    // Non-critical: never fail the business request
  }
}
