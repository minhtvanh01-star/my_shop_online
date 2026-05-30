import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  changePasswordHandler,
  createAddressHandler,
  deleteAddressHandler,
  getProfileHandler,
  listAddressesHandler,
  updateAddressHandler,
  updateProfileHandler,
} from './users.controller';

const router = Router();

// Profile
router.get('/me', authenticate, getProfileHandler);
router.put('/me', authenticate, updateProfileHandler);
router.put('/me/password', authenticate, changePasswordHandler);

// Addresses
router.get('/me/addresses', authenticate, listAddressesHandler);
router.post('/me/addresses', authenticate, createAddressHandler);
router.put('/me/addresses/:id', authenticate, updateAddressHandler);
router.delete('/me/addresses/:id', authenticate, deleteAddressHandler);

export default router;
