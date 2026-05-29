import { Router } from 'express';

const router = Router();

// POST   /api/v1/media/upload       — single file upload to R2
// POST   /api/v1/media/upload/bulk  — multiple files
// GET    /api/v1/media              — media library (admin)
// DELETE /api/v1/media/:key         — delete from R2 (admin)

export default router;
