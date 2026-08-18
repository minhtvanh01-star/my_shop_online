import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireFeature } from '../../middlewares/feature.middleware';
import { FEATURE_KEYS } from '../../utils/features';
import {
  addToWishlistHandler,
  getWishlistHandler,
  removeFromWishlistHandler,
} from './wishlist.controller';

const router = Router();

router.use(requireFeature(FEATURE_KEYS.wishlist));

router.get('/', authenticate, getWishlistHandler);
router.post('/:productId', authenticate, addToWishlistHandler);
router.delete('/:productId', authenticate, removeFromWishlistHandler);

export default router;
