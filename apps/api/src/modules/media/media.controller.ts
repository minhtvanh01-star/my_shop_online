import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { ok, created, paginated } from '../../utils/response';
import { MediaQuerySchema } from './media.schema';
import * as MediaService from './media.service';

export async function uploadFileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file provided', 'INVALID_FILE_TYPE');
    }
    const result = await MediaService.uploadSingle(req.file, req.user!.id);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function uploadBulkHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError(400, 'No files provided', 'INVALID_FILE_TYPE');
    }
    const results = await MediaService.uploadBulk(files, req.user!.id);
    created(res, results);
  } catch (err) {
    next(err);
  }
}

export async function listMediaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = MediaQuerySchema.parse(req.query);
    const { items, total, page, limit } = await MediaService.listMediaFiles(query);
    paginated(res, items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

export async function deleteMediaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await MediaService.deleteMediaFile(req.params.id);
    ok(res, { message: 'Media file deleted successfully' });
  } catch (err) {
    next(err);
  }
}
