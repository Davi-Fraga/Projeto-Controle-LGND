-- AlterTable
ALTER TABLE "Legendary"
  ADD COLUMN "firstTopIsExternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "firstTopEventId" UUID,
  ADD COLUMN "firstTopFamilyId" UUID,
  ADD COLUMN "firstTopExternalText" TEXT,
  ADD COLUMN "firstTopNotes" TEXT;

-- AddForeignKey
ALTER TABLE "Legendary" ADD CONSTRAINT "Legendary_firstTopEventId_fkey" FOREIGN KEY ("firstTopEventId") REFERENCES "TopEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Legendary" ADD CONSTRAINT "Legendary_firstTopFamilyId_fkey" FOREIGN KEY ("firstTopFamilyId") REFERENCES "TopFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Legendary_firstTopEventId_idx" ON "Legendary"("firstTopEventId");
CREATE INDEX "Legendary_firstTopFamilyId_idx" ON "Legendary"("firstTopFamilyId");
