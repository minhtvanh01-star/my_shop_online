import { Router } from 'express';

const router = Router();

// GET   /api/v1/settings            — public settings (site name, currency, etc.)
// GET   /api/v1/settings/admin      — all settings (admin)
// PUT   /api/v1/settings/:key       — admin
// GET   /api/v1/settings/features   — feature flags

export default router;
