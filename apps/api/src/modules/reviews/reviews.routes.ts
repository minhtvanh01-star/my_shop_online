import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
import {
  listReviewsHandler,
  createReviewHandler,
  updateReviewHandler,
  deleteReviewHandler,
  approveReviewHandler,
} from './reviews.controller';

const router = Router();

// GET /api/v1/reviews?productId=xxx — public: list approved reviews for a product
router.get('/', listReviewsHandler);

// POST /api/v1/reviews — customer: create review
router.post('/', authenticate, createReviewHandler);

// PUT /api/v1/reviews/:id — customer: update own review
router.put('/:id', authenticate, updateReviewHandler);

// DELETE /api/v1/reviews/:id — customer: delete own review
router.delete('/:id', authenticate, deleteReviewHandler);

// PATCH /api/v1/reviews/:id/approve — admin: approve/reject review
router.patch(
  '/:id/approve',
  authenticate,
  requireAdmin,
  auditLog('MODERATE_REVIEW', 'ProductReview'),
  approveReviewHandler,
);

export default router;
