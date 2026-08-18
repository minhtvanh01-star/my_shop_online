import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { requireFeature } from '../../middlewares/feature.middleware';
import { FEATURE_KEYS } from '../../utils/features';
import { auditLog } from '../../middlewares/audit.middleware';
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
router.get('/categories', requireFeature(FEATURE_KEYS.blog), listPostCategoriesHandler);

// POST /api/v1/blog/categories — admin/content: create blog category
router.post(
  '/categories',
  authenticate,
  requireContentRole,
  auditLog('CREATE_BLOG_CATEGORY', 'BlogCategory'),
  createPostCategoryHandler,
);

// GET /api/v1/blog — public: list published posts (paginated)
router.get('/', requireFeature(FEATURE_KEYS.blog), listPostsHandler);

// GET /api/v1/blog/:slug — public: get post by slug
router.get('/:slug', requireFeature(FEATURE_KEYS.blog), getPostBySlugHandler);

// POST /api/v1/blog — admin/content: create post
router.post('/', authenticate, requireContentRole, auditLog('CREATE_BLOG_POST', 'BlogPost'), createPostHandler);

// PUT /api/v1/blog/:id — admin/content: update post
router.put('/:id', authenticate, requireContentRole, auditLog('UPDATE_BLOG_POST', 'BlogPost'), updatePostHandler);

// DELETE /api/v1/blog/:id — admin/content: soft-delete post
router.delete('/:id', authenticate, requireContentRole, auditLog('DELETE_BLOG_POST', 'BlogPost'), deletePostHandler);

export default router;
