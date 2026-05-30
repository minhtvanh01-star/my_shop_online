import { PostStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import type {
  CreatePostCategoryDto,
  CreatePostDto,
  ListPostsQueryDto,
  UpdatePostDto,
} from './blog.schema';

const POST_SELECT = {
  id: true,
  slug: true,
  featuredImageUrl: true,
  status: true,
  isFeatured: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, fullName: true } },
  category: { select: { id: true, slug: true, name: true } },
  translations: {
    select: {
      locale: true,
      title: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
    },
  },
} as const;

const POST_DETAIL_SELECT = {
  id: true,
  slug: true,
  featuredImageUrl: true,
  status: true,
  isFeatured: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, fullName: true } },
  category: { select: { id: true, slug: true, name: true } },
  translations: {
    select: {
      locale: true,
      title: true,
      content: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
    },
  },
} as const;

export async function listPublishedPosts(query: ListPostsQueryDto) {
  const { page, limit, categoryId, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    status: PostStatus.published,
    deletedAt: null as null,
    ...(categoryId && { categoryId }),
    ...(search && {
      translations: { some: { title: { contains: search, mode: 'insensitive' as const } } },
    }),
  };

  const [total, items] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: POST_SELECT,
    }),
  ]);

  return { items, total, page, limit };
}

export async function getPostBySlug(slug: string) {
  const post = await prisma.post.findFirst({
    where: { slug, status: PostStatus.published, deletedAt: null },
    select: POST_DETAIL_SELECT,
  });

  if (!post) {
    throw new AppError(404, 'Post not found', 'POST_NOT_FOUND');
  }

  // Increment viewCount asynchronously (fire-and-forget)
  prisma.post.update({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  }).catch(() => { /* ignore */ });

  return post;
}

export async function createPost(dto: CreatePostDto, authorId: string) {
  const { translations, ...postData } = dto;

  // Check slug unique (including soft-deleted)
  const existing = await prisma.post.findFirst({ where: { slug: postData.slug } });
  if (existing) {
    throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
  }

  const publishedAt =
    postData.status === 'published' ? new Date() : undefined;

  return prisma.post.create({
    data: {
      authorId,
      categoryId: postData.categoryId,
      slug: postData.slug,
      featuredImageUrl: postData.featuredImageUrl,
      status: postData.status as PostStatus,
      isFeatured: postData.isFeatured,
      publishedAt,
      translations: { create: translations },
    },
    select: POST_DETAIL_SELECT,
  });
}

export async function updatePost(id: string, dto: UpdatePostDto, updatedBy: string) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  if (!post) {
    throw new AppError(404, 'Post not found', 'POST_NOT_FOUND');
  }

  if (dto.slug && dto.slug !== post.slug) {
    const slugExists = await prisma.post.findFirst({ where: { slug: dto.slug } });
    if (slugExists) {
      throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
    }
  }

  const { translations, ...postData } = dto;

  // Set publishedAt when transitioning to published for the first time
  let publishedAt: Date | undefined = undefined;
  if (postData.status === 'published' && post.status !== 'published' && !post.publishedAt) {
    publishedAt = new Date();
  }

  return prisma.post.update({
    where: { id },
    data: {
      ...(postData.categoryId && { categoryId: postData.categoryId }),
      ...(postData.slug && { slug: postData.slug }),
      ...(postData.featuredImageUrl !== undefined && {
        featuredImageUrl: postData.featuredImageUrl,
      }),
      ...(postData.status && { status: postData.status as PostStatus }),
      ...(postData.isFeatured !== undefined && { isFeatured: postData.isFeatured }),
      ...(publishedAt && { publishedAt }),
      updatedBy,
      ...(translations && {
        translations: { deleteMany: {}, create: translations },
      }),
    },
    select: POST_DETAIL_SELECT,
  });
}

export async function deletePost(id: string, deletedBy: string) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!post) {
    throw new AppError(404, 'Post not found', 'POST_NOT_FOUND');
  }

  await prisma.post.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
  });
}

export async function listPostCategories() {
  return prisma.postCategory.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

export async function createPostCategory(dto: CreatePostCategoryDto, createdBy: string) {
  const existing = await prisma.postCategory.findFirst({ where: { slug: dto.slug } });
  if (existing) {
    throw new AppError(409, 'Slug already exists', 'SLUG_CONFLICT');
  }

  return prisma.postCategory.create({
    data: {
      parentId: dto.parentId,
      slug: dto.slug,
      name: dto.name,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      createdBy,
    },
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
    },
  });
}
