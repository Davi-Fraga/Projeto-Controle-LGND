CREATE TYPE "TopFamilyMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED');
CREATE TYPE "LegendaryHistoryType" AS ENUM (
  'LEGENDARY_CREATED',
  'LEGENDARY_UPDATED',
  'TEAM_JOINED',
  'TEAM_LEFT',
  'TEAM_ROLE_CHANGED',
  'TOP_PARTICIPATED',
  'TOP_PARTICIPATION_CANCELLED',
  'TOP_SERVED',
  'TOP_SERVICE_CANCELLED',
  'TOP_REPRESENTATIVE_ASSIGNED',
  'TOP_DEPUTY_ASSIGNED',
  'FAMILY_JOINED',
  'FAMILY_LEFT',
  'FAMILY_TRANSFERRED',
  'FAMILY_REPRESENTATIVE_ASSIGNED',
  'FAMILY_DEPUTY_ASSIGNED',
  'MANUAL_NOTE'
);

CREATE TABLE "TopFamily" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "topEventId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "representativeLegendaryId" UUID NOT NULL,
  "deputyRepresentativeLegendaryId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopFamily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopFamilyMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "topEventId" UUID NOT NULL,
  "topFamilyId" UUID NOT NULL,
  "topParticipantId" UUID NOT NULL,
  "status" "TopFamilyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopFamilyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegendaryHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "legendaryId" UUID NOT NULL,
  "type" "LegendaryHistoryType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "topEventId" UUID,
  "teamId" UUID,
  "topFamilyId" UUID,
  "actorUserId" UUID,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegendaryHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TopFamily_topEventId_idx" ON "TopFamily"("topEventId");
CREATE INDEX "TopFamily_name_idx" ON "TopFamily"("name");
CREATE INDEX "TopFamily_representativeLegendaryId_idx" ON "TopFamily"("representativeLegendaryId");
CREATE INDEX "TopFamily_deputyRepresentativeLegendaryId_idx" ON "TopFamily"("deputyRepresentativeLegendaryId");
CREATE INDEX "TopFamilyMember_topEventId_idx" ON "TopFamilyMember"("topEventId");
CREATE INDEX "TopFamilyMember_topFamilyId_idx" ON "TopFamilyMember"("topFamilyId");
CREATE INDEX "TopFamilyMember_topParticipantId_idx" ON "TopFamilyMember"("topParticipantId");
CREATE INDEX "TopFamilyMember_status_idx" ON "TopFamilyMember"("status");
CREATE INDEX "LegendaryHistory_legendaryId_idx" ON "LegendaryHistory"("legendaryId");
CREATE INDEX "LegendaryHistory_type_idx" ON "LegendaryHistory"("type");
CREATE INDEX "LegendaryHistory_topEventId_idx" ON "LegendaryHistory"("topEventId");
CREATE INDEX "LegendaryHistory_teamId_idx" ON "LegendaryHistory"("teamId");
CREATE INDEX "LegendaryHistory_topFamilyId_idx" ON "LegendaryHistory"("topFamilyId");
CREATE INDEX "LegendaryHistory_actorUserId_idx" ON "LegendaryHistory"("actorUserId");
CREATE INDEX "LegendaryHistory_occurredAt_idx" ON "LegendaryHistory"("occurredAt");

CREATE UNIQUE INDEX "TopFamily_active_name_unique_idx" ON "TopFamily"("topEventId", lower("name")) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "TopFamilyMember_active_participant_unique_idx" ON "TopFamilyMember"("topEventId", "topParticipantId") WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE';

ALTER TABLE "TopFamily" ADD CONSTRAINT "TopFamily_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopFamily" ADD CONSTRAINT "TopFamily_representativeLegendaryId_fkey" FOREIGN KEY ("representativeLegendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopFamily" ADD CONSTRAINT "TopFamily_deputyRepresentativeLegendaryId_fkey" FOREIGN KEY ("deputyRepresentativeLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopFamilyMember" ADD CONSTRAINT "TopFamilyMember_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopFamilyMember" ADD CONSTRAINT "TopFamilyMember_topFamilyId_fkey" FOREIGN KEY ("topFamilyId") REFERENCES "TopFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopFamilyMember" ADD CONSTRAINT "TopFamilyMember_topParticipantId_fkey" FOREIGN KEY ("topParticipantId") REFERENCES "TopParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_topFamilyId_fkey" FOREIGN KEY ("topFamilyId") REFERENCES "TopFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
