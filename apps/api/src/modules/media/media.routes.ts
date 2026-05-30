import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/rbac.middleware';
import {
  uploadFileHandler,
  uploadBulkHandler,
  listMediaHandler,
  deleteMediaHandler,
} from './media.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

// POST /api/v1/media/upload       — single file upload to R2
router.post('/upload', authenticate, requireAdmin, upload.single('file'), uploadFileHandler);

// POST /api/v1/media/upload/bulk  — multiple files (max 10)
router.post('/upload/bulk', authenticate, requireAdmin, upload.array('files', 10), uploadBulkHandler);

// GET /api/v1/media               — media library (admin, paginated)
router.get('/', authenticate, requireAdmin, listMediaHandler);

// DELETE /api/v1/media/:id        — delete file from R2 + DB record
router.delete('/:id', authenticate, requireAdmin, deleteMediaHandler);

export default router;
