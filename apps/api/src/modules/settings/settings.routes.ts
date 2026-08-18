import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import { auditLog } from '../../middlewares/audit.middleware';
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

// GET  /api/v1/settings/admin        — all settings (ADMIN+)
router.get('/admin', authenticate, requireAdmin, getAllSettingsHandler);

// GET  /api/v1/settings/features     — all active feature flags (public)
router.get('/features', getFeatureFlagsHandler);

// PUT  /api/v1/settings/:key         — update setting value (ADMIN+)
router.put(
  '/:key',
  authenticate,
  requireAdmin,
  auditLog('UPDATE_SETTING', 'Setting', { sensitive: true, omitBody: true, resourceIdParam: 'key' }),
  updateSettingHandler,
);

// PATCH /api/v1/settings/features/:key — toggle feature flag (SUPER_ADMIN)
router.patch(
  '/features/:key',
  authenticate,
  requireAdmin,
  auditLog('TOGGLE_FEATURE_FLAG', 'FeatureFlag', { sensitive: true, omitBody: true, resourceIdParam: 'key' }),
  toggleFeatureFlagHandler,
);

export default router;
