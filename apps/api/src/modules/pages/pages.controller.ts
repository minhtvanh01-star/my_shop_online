import { NextFunction, Request, Response } from 'express';
import { ok, created } from '../../utils/response';
import { CreatePageSchema, UpdatePageSchema } from './pages.schema';
import * as PageService from './pages.service';

export async function getPageBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = await PageService.getPageBySlug(req.params.slug);
    ok(res, page);
  } catch (err) {
    next(err);
  }
}

export async function createPageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = CreatePageSchema.parse(req.body);
    const page = await PageService.createPage(dto, req.user!.id);
    created(res, page);
  } catch (err) {
    next(err);
  }
}

export async function updatePageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = UpdatePageSchema.parse(req.body);
    const page = await PageService.updatePage(req.params.id, dto, req.user!.id);
    ok(res, page);
  } catch (err) {
    next(err);
  }
}

export async function deletePageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await PageService.deletePage(req.params.id, req.user!.id);
    ok(res, { message: 'Page deleted' });
  } catch (err) {
    next(err);
  }
}
