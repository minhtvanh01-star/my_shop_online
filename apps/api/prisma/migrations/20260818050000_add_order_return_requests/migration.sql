-- CreateEnum
CREATE TYPE "ReturnRequestType" AS ENUM ('refund', 'exchange');

-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- CreateTable
CREATE TABLE "order_return_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ReturnRequestType" NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "adminNote" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_return_requests_orderId_idx" ON "order_return_requests"("orderId");

-- CreateIndex
CREATE INDEX "order_return_requests_userId_idx" ON "order_return_requests"("userId");

-- CreateIndex
CREATE INDEX "order_return_requests_status_idx" ON "order_return_requests"("status");

-- AddForeignKey
ALTER TABLE "order_return_requests" ADD CONSTRAINT "order_return_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_requests" ADD CONSTRAINT "order_return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
