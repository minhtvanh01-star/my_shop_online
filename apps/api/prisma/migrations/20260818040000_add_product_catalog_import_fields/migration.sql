-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variable', 'grouped', 'external', 'variation');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'simple',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "importMeta" JSONB;

-- AlterTable
ALTER TABLE "product_translations" ADD COLUMN "shortDescription" TEXT;

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");

-- CreateIndex
CREATE UNIQUE INDEX "products_externalSource_externalId_key" ON "products"("externalSource", "externalId");

-- CreateIndex
CREATE INDEX "product_categories_productId_idx" ON "product_categories"("productId");

-- CreateIndex
CREATE INDEX "product_categories_categoryId_idx" ON "product_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_productId_categoryId_key" ON "product_categories"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "product_specifications_productId_locale_idx" ON "product_specifications"("productId", "locale");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill primary category links for existing products
INSERT INTO "product_categories" ("id", "productId", "categoryId", "isPrimary", "sortOrder")
SELECT gen_random_uuid(), "id", "categoryId", true, 0
FROM "products";
