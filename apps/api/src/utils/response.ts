import { Response } from 'express';

export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number },
): Response {
  return res.status(200).json({
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
      hasNextPage: meta.page * meta.limit < meta.total,
      hasPrevPage: meta.page > 1,
    },
  });
}
