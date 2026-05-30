import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  addToWishlistHandler,
  getWishlistHandler,
  removeFromWishlistHandler,
} from './wishlist.controller';

const router = Router();

router.get('/', authenticate, getWishlistHandler);
router.post('/:productId', authenticate, addToWishlistHandler);
router.delete('/:productId', authenticate, removeFromWishlistHandler);

export default router;
