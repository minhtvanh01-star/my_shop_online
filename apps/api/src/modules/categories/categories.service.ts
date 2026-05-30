import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.schema';

const categorySelect = {
  id: true,
  parentId: true,
  slug: true,
  name: true,
  imageUrl: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export async function listCategoriesTree() {
  const allCategories = await prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      ...categorySelect,
      children: {
        where: { deletedAt: null, isActive: true },
        select: categorySelect,
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Return only top-level (no parent) with their children nested
  return allCategories.filter((c) => c.parentId === null);
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    select: {
      ...categorySelect,
      children: {
        where: { deletedAt: null, isActive: true },
        select: categorySelect,
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!category) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  return category;
}

export async function createCategory(dto: CreateCategoryDto, actorId: string) {
  // Check slug uniqueness including soft-deleted
  const slugExists = await prisma.category.findFirst({ where: { slug: dto.slug } });
  if (slugExists) throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');

  return prisma.category.create({
    data: { ...dto, createdBy: actorId },
    select: categorySelect,
  });
}

export async function updateCategory(id: string, dto: UpdateCategoryDto, actorId: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, deletedAt: true, slug: true },
  });
  if (!category || category.deletedAt !== null) {
    throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }

  if (dto.slug && dto.slug !== category.slug) {
    const slugExists = await prisma.category.findFirst({
      where: { slug: dto.slug, id: { not: id } },
    });
    if (slugExists) throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
  }

  return prisma.category.update({
    where: { id },
    data: { ...dto, updatedBy: actorId },
    select: categorySelect,
  });
}

export async function deleteCategory(id: string, actorId: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });
  if (!category || category.deletedAt !== null) {
    throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }

  await prisma.category.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: actorId,
      isActive: false,
    },
  });
}
