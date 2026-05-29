ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'TOP_FAMILY_COORDINATOR_ASSIGNED';
ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'TOP_FAMILY_DEPUTY_COORDINATOR_ASSIGNED';
ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'TOP_FAMILY_GENERAL_COORDINATOR_ASSIGNED';

ALTER TABLE "Legendary" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TopEvent"
  ADD COLUMN "familyCoordinatorLegendaryId" UUID,
  ADD COLUMN "familyDeputyCoordinatorLegendaryId" UUID,
  ADD COLUMN "familyGeneralCoordinatorLegendaryId" UUID,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TopFamily"
  ALTER COLUMN "representativeLegendaryId" DROP NOT NULL,
  ADD COLUMN "representativeRole" TEXT,
  ADD COLUMN "deputyRepresentativeRole" TEXT,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TopFamilyMember"
  ADD COLUMN "sourceNotes" TEXT,
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_familyCoordinatorLegendaryId_fkey" FOREIGN KEY ("familyCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_familyDeputyCoordinatorLegendaryId_fkey" FOREIGN KEY ("familyDeputyCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_familyGeneralCoordinatorLegendaryId_fkey" FOREIGN KEY ("familyGeneralCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Legendary_needsReview_idx" ON "Legendary"("needsReview");
CREATE INDEX "TopEvent_familyCoordinatorLegendaryId_idx" ON "TopEvent"("familyCoordinatorLegendaryId");
CREATE INDEX "TopEvent_needsReview_idx" ON "TopEvent"("needsReview");
CREATE INDEX "TopFamily_needsReview_idx" ON "TopFamily"("needsReview");
CREATE INDEX "TopFamilyMember_needsReview_idx" ON "TopFamilyMember"("needsReview");
