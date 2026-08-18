import type { Request, Response } from 'express';

const REDACT_KEY =
  /^(password|passwordHash|currentPassword|newPassword|confirmPassword|token|accessToken|refreshToken|secret|apiKey|authorization|cookie|clientSecret)$/i;

export type AuditLogOptions = {
  sensitive?: boolean;
  omitBody?: boolean;
  resourceIdParam?: string;
};

export type AuditLogFilters = {
  actorId?: string;
  resourceType?: string;
  action?: string;
  from?: string;
  to?: string;
};

export type AuditLogWhere = {
  isSensitive?: boolean;
  actorId?: string;
  resourceType?: string;
  action?: string;
  createdAt?: { gte?: Date; lte?: Date };
};

export function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactAuditValue(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEY.test(key) ? '[redacted]' : redactAuditValue(nested, depth + 1);
  }
  return out;
}

export function extractCreatedId(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('data' in body)) return null;
  const data = (body as { data: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function resolveAuditResourceId(
  params: Record<string, string | undefined>,
  body: unknown,
  localsId?: string,
  paramName?: string,
): string | null {
  if (paramName && params[paramName]) return params[paramName] ?? null;
  if (params.id) return params.id;
  if (params.key) return params.key;
  if (params.returnId) return params.returnId;
  if (localsId) return localsId;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const productId = (body as { productId?: unknown }).productId;
    if (typeof productId === 'string' && productId.length > 0) return productId;
  }
  return null;
}

export function auditLogListWhere(role: string, filters: AuditLogFilters): AuditLogWhere {
  const createdAt = dateRange(filters.from, filters.to);
  return {
    ...(role === 'SUPER_ADMIN' ? {} : { isSensitive: false }),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

function dateRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const gte = parseDayStart(from);
  const lte = parseDayEnd(to);
  if (!gte && !lte) return undefined;
  return { ...(gte && { gte }), ...(lte && { lte }) };
}

function parseDayStart(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDayEnd(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function attachAuditResponseCapture(res: Response): void {
  const send = res.json.bind(res);
  res.json = ((body: unknown) => {
    const id = extractCreatedId(body);
    if (id) res.locals.auditResourceId = id;
    return send(body);
  }) as typeof res.json;
}

export function captureAuditNewValue(req: Request, options?: AuditLogOptions): unknown {
  if (options?.omitBody) return undefined;
  if (!req.body || typeof req.body !== 'object') return undefined;
  if (Buffer.isBuffer(req.body)) return undefined;
  return req.body;
}
