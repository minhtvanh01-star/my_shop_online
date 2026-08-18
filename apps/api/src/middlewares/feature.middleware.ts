import type { NextFunction, Request, Response } from 'express';
import { assertFeatureEnabled } from '../utils/features';

export function requireFeature(key: string) {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await assertFeatureEnabled(key);
      next();
    } catch (err) {
      next(err);
    }
  };
}
