/*
  Warnings:

  - Added the required column `updatedAt` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `product_prices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `shipping_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tags` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PageStatus" ADD VALUE 'archived';

-- AlterTable
ALTER TABLE "admin_accounts" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "media_files" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "processedBy" UUID;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "post_categories" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" UUID;

-- AlterTable
ALTER TABLE "product_prices" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "product_reviews" ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" UUID;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "shipping_methods" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "stock_alerts" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "system_configs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "user_addresses" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID;

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "post_categories_isActive_idx" ON "post_categories"("isActive");

-- CreateIndex
CREATE INDEX "product_variants_isActive_idx" ON "product_variants"("isActive");

-- CreateIndex
CREATE INDEX "system_configs_isActive_idx" ON "system_configs"("isActive");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
