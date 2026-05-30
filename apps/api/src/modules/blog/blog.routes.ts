import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import {
  listPostsHandler,
  getPostBySlugHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  listPostCategoriesHandler,
  createPostCategoryHandler,
} from './blog.controller';

const router = Router();

const requireContentRole = requireRole('ADMIN', 'SUPER_ADMIN', 'CONTENT');

// GET /api/v1/blog/categories — public: list blog categories
// NOTE: must be declared before /:slug to avoid being matched as a slug
router.get('/categories', listPostCategoriesHandler);

// POST /api/v1/blog/categories — admin/content: create blog category
router.post('/categories', authenticate, requireContentRole, createPostCategoryHandler);

// GET /api/v1/blog — public: list published posts (paginated)
router.get('/', listPostsHandler);

// GET /api/v1/blog/:slug — public: get post by slug
router.get('/:slug', getPostBySlugHandler);

// POST /api/v1/blog — admin/content: create post
router.post('/', authenticate, requireContentRole, createPostHandler);

// PUT /api/v1/blog/:id — admin/content: update post
router.put('/:id', authenticate, requireContentRole, updatePostHandler);

// DELETE /api/v1/blog/:id — admin/content: soft-delete post
router.delete('/:id', authenticate, requireContentRole, deletePostHandler);

export default router;
