import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  addItemHandler,
  clearCartHandler,
  getCartHandler,
  removeItemHandler,
  updateItemHandler,
} from './cart.controller';

const router = Router();

router.use(authenticate);

router.get('/', getCartHandler);
router.post('/items', addItemHandler);
router.put('/items/:itemId', updateItemHandler);
router.delete('/items/:itemId', removeItemHandler);
router.delete('/', clearCartHandler);

export default router;
