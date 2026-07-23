-- CreateEnum
CREATE TYPE "UserScopeSelectionMode" AS ENUM ('SELECTED', 'ALL');

-- CreateTable
CREATE TABLE "UserScopePolicy" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "UserScopeType" NOT NULL,
    "mode" "UserScopeSelectionMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserScopePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserScopePolicy_userId_idx" ON "UserScopePolicy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserScopePolicy_userId_type_key" ON "UserScopePolicy"("userId", "type");

-- AddForeignKey
ALTER TABLE "UserScopePolicy" ADD CONSTRAINT "UserScopePolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
