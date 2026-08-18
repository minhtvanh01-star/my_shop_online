import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import { getShopConfig } from '../../utils/shop-config';
import type { MediaQueryDto } from './media.schema';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function useLocalMedia(): boolean {
  const accountId = env.R2_ACCOUNT_ID;
  return !accountId || accountId === 'local' || accountId.startsWith('your_');
}

function publicApiBase(): string {
  return env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`;
}

async function storeUploadedFile(file: UploadedFile): Promise<{ filename: string; url: string }> {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.', 'INVALID_FILE_TYPE');
  }

  const shop = await getShopConfig();
  const maxBytes = shop.mediaMaxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(400, `File exceeds ${shop.mediaMaxFileSizeMb}MB limit`, 'FILE_TOO_LARGE');
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${uuidv4()}${ext}`;

  if (useLocalMedia()) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
    return { filename, url: `${publicApiBase()}/uploads/${filename}` };
  }

  const url = `${env.R2_PUBLIC_URL}/${filename}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );
  return { filename, url };
}

export async function uploadSingle(file: UploadedFile, uploadedBy: string) {
  const { filename, url } = await storeUploadedFile(file);

  return prisma.mediaFile.create({
    data: {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      url,
      uploadedBy,
    },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      fileSizeBytes: true,
      url: true,
      cdnUrl: true,
      altText: true,
      folder: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function uploadBulk(files: UploadedFile[], uploadedBy: string) {
  const results = await Promise.all(files.map((file) => uploadSingle(file, uploadedBy)));
  return results;
}

export async function listMediaFiles(query: MediaQueryDto) {
  const { page, limit, folder, mimeType } = query;
  const skip = (page - 1) * limit;

  const where = {
    isActive: true,
    ...(folder ? { folder } : {}),
    ...(mimeType ? { mimeType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.mediaFile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        fileSizeBytes: true,
        url: true,
        cdnUrl: true,
        altText: true,
        folder: true,
        isActive: true,
        createdAt: true,
        uploader: {
          select: { id: true, fullName: true },
        },
      },
    }),
    prisma.mediaFile.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function deleteMediaFile(id: string) {
  const media = await prisma.mediaFile.findUnique({
    where: { id },
    select: { id: true, filename: true, isActive: true },
  });

  if (!media || !media.isActive) {
    throw new AppError(404, 'Media file not found', 'MEDIA_NOT_FOUND');
  }

  if (useLocalMedia()) {
    await fs.unlink(path.join(UPLOAD_DIR, media.filename)).catch(() => undefined);
  } else {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: media.filename,
      }),
    );
  }

  await prisma.mediaFile.update({
    where: { id },
    data: { isActive: false },
  });
}
