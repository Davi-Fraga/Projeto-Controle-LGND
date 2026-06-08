-- CreateEnum
CREATE TYPE "TopPreRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TopPreRegistration" (
    "id" UUID NOT NULL,
    "topEventId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "churchName" TEXT,
    "rawPayload" JSONB NOT NULL,
    "status" "TopPreRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "legendaryId" UUID,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TopPreRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopPreRegistration_topEventId_status_idx" ON "TopPreRegistration"("topEventId", "status");

-- CreateIndex
CREATE INDEX "TopPreRegistration_status_idx" ON "TopPreRegistration"("status");

-- CreateIndex
CREATE INDEX "TopPreRegistration_email_idx" ON "TopPreRegistration"("email");

-- AddForeignKey
ALTER TABLE "TopPreRegistration" ADD CONSTRAINT "TopPreRegistration_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
