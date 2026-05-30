import { NextFunction, Request, Response } from 'express';
import { ok, created } from '../../utils/response';
import { CreateCategorySchema, UpdateCategorySchema } from './categories.schema';
import * as CategoryService from './categories.service';

export async function listCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await CategoryService.listCategoriesTree();
    ok(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBySlugHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await CategoryService.getCategoryBySlug(req.params.slug);
    ok(res, category);
  } catch (err) {
    next(err);
  }
}

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateCategorySchema.parse(req.body);
    const category = await CategoryService.createCategory(dto, req.user!.id);
    created(res, category);
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateCategorySchema.parse(req.body);
    const category = await CategoryService.updateCategory(req.params.id, dto, req.user!.id);
    ok(res, category);
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await CategoryService.deleteCategory(req.params.id, req.user!.id);
    ok(res, { message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}
