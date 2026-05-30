import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import {
  getPublicSettingsHandler,
  getAllSettingsHandler,
  updateSettingHandler,
  getFeatureFlagsHandler,
  toggleFeatureFlagHandler,
} from './settings.controller';

const router = Router();

// GET  /api/v1/settings              — public settings (isPublic: true, isActive: true)
router.get('/', getPublicSettingsHandler);

// GET  /api/v1/settings/admin        — all settings (SUPER_ADMIN)
router.get('/admin', authenticate, requireSuperAdmin, getAllSettingsHandler);

// GET  /api/v1/settings/features     — all active feature flags (public)
router.get('/features', getFeatureFlagsHandler);

// PUT  /api/v1/settings/:key         — update setting value (SUPER_ADMIN)
router.put('/:key', authenticate, requireSuperAdmin, updateSettingHandler);

// PATCH /api/v1/settings/features/:key — toggle feature flag (SUPER_ADMIN)
router.patch('/features/:key', authenticate, requireSuperAdmin, toggleFeatureFlagHandler);

export default router;
