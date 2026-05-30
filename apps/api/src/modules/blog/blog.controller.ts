import { NextFunction, Request, Response } from 'express';
import { ok, created, paginated } from '../../utils/response';
import {
  ListPostsQuerySchema,
  CreatePostSchema,
  UpdatePostSchema,
  CreatePostCategorySchema,
} from './blog.schema';
import * as BlogService from './blog.service';

export async function listPostsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ListPostsQuerySchema.parse(req.query);
    const result = await BlogService.listPublishedPosts(query);
    paginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getPostBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await BlogService.getPostBySlug(req.params.slug);
    ok(res, post);
  } catch (err) {
    next(err);
  }
}

export async function createPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = CreatePostSchema.parse(req.body);
    const post = await BlogService.createPost(dto, req.user!.id);
    created(res, post);
  } catch (err) {
    next(err);
  }
}

export async function updatePostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = UpdatePostSchema.parse(req.body);
    const post = await BlogService.updatePost(req.params.id, dto, req.user!.id);
    ok(res, post);
  } catch (err) {
    next(err);
  }
}

export async function deletePostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await BlogService.deletePost(req.params.id, req.user!.id);
    ok(res, { message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listPostCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await BlogService.listPostCategories();
    ok(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function createPostCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = CreatePostCategorySchema.parse(req.body);
    const category = await BlogService.createPostCategory(dto, req.user!.id);
    created(res, category);
  } catch (err) {
    next(err);
  }
}
