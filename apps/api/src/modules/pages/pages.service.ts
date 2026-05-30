import { PageStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { CreatePageDto, UpdatePageDto } from './pages.schema';

const PAGE_SELECT = {
  id: true,
  slug: true,
  status: true,
  showInNav: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, fullName: true } },
  translations: {
    select: {
      locale: true,
      title: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
    },
  },
} as const;

export async function getPageBySlug(slug: string) {
  const page = await prisma.page.findFirst({
    where: { slug, status: PageStatus.published, deletedAt: null },
    select: PAGE_SELECT,
  });

  if (!page) {
    throw new AppError(404, 'Page not found', 'PAGE_NOT_FOUND');
  }

  return page;
}

export async function createPage(dto: CreatePageDto, authorId: string) {
  const { translations, ...pageData } = dto;

  // Check slug unique (including soft-deleted)
  const existing = await prisma.page.findFirst({ where: { slug: pageData.slug } });
  if (existing) {
    throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
  }

  return prisma.page.create({
    data: {
      authorId,
      slug: pageData.slug,
      status: pageData.status as PageStatus,
      showInNav: pageData.showInNav,
      sortOrder: pageData.sortOrder,
      translations: { create: translations },
    },
    select: PAGE_SELECT,
  });
}

export async function updatePage(id: string, dto: UpdatePageDto, updatedBy: string) {
  const page = await prisma.page.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true },
  });

  if (!page) {
    throw new AppError(404, 'Page not found', 'PAGE_NOT_FOUND');
  }

  if (dto.slug && dto.slug !== page.slug) {
    const slugExists = await prisma.page.findFirst({ where: { slug: dto.slug } });
    if (slugExists) {
      throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
    }
  }

  const { translations, ...pageData } = dto;

  return prisma.page.update({
    where: { id },
    data: {
      ...(pageData.slug && { slug: pageData.slug }),
      ...(pageData.status && { status: pageData.status as PageStatus }),
      ...(pageData.showInNav !== undefined && { showInNav: pageData.showInNav }),
      ...(pageData.sortOrder !== undefined && { sortOrder: pageData.sortOrder }),
      updatedBy,
      ...(translations && {
        translations: { deleteMany: {}, create: translations },
      }),
    },
    select: PAGE_SELECT,
  });
}

export async function deletePage(id: string, deletedBy: string) {
  const page = await prisma.page.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!page) {
    throw new AppError(404, 'Page not found', 'PAGE_NOT_FOUND');
  }

  await prisma.page.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
  });
}
