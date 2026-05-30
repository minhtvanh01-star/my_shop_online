import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { created, ok, paginated } from '../../utils/response';
import {
  CreateProductSchema,
  CreateVariantSchema,
  ProductListQuery,
  UpdateProductSchema,
} from './products.schema';
import * as ProductsService from './products.service';

export async function listProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ProductListQuery.parse(req.query);
    const result = await ProductsService.listProducts(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const locale = (req.query.locale as string) ?? 'en';
    const product = await ProductsService.getProductBySlug(req.params.slug, locale);
    ok(res, product);
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateProductSchema.parse(req.body);
    const product = await ProductsService.createProduct(dto, req.user!.id);
    created(res, product);
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = UpdateProductSchema.parse(req.body);
    const product = await ProductsService.updateProduct(req.params.id, dto, req.user!.id);
    ok(res, product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.deleteProduct(req.params.id, req.user!.id);
    ok(res, { message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listAdminProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ProductListQuery.parse(req.query);
    const result = await ProductsService.listAdminProducts(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function toggleActiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const product = await ProductsService.toggleProductActive(req.params.id, isActive, req.user!.id);
    ok(res, product);
  } catch (err) {
    next(err);
  }
}

export async function getVariantsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const variants = await ProductsService.getProductVariants(req.params.id);
    ok(res, variants);
  } catch (err) {
    next(err);
  }
}

export async function createVariantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = CreateVariantSchema.parse(req.body);
    const variant = await ProductsService.createVariant(req.params.id, dto, req.user!.id);
    created(res, variant);
  } catch (err) {
    next(err);
  }
}
