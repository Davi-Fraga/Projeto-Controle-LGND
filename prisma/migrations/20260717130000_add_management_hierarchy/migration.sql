-- AlterTable
ALTER TABLE "Legendary" ADD COLUMN     "cityLeaderId" UUID;

-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN     "managerMembershipId" UUID;

-- CreateIndex
CREATE INDEX "Legendary_cityLeaderId_idx" ON "Legendary"("cityLeaderId");

-- CreateIndex
CREATE INDEX "TeamMembership_managerMembershipId_idx" ON "TeamMembership"("managerMembershipId");

-- AddForeignKey
ALTER TABLE "Legendary" ADD CONSTRAINT "Legendary_cityLeaderId_fkey" FOREIGN KEY ("cityLeaderId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_managerMembershipId_fkey" FOREIGN KEY ("managerMembershipId") REFERENCES "TeamMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
