CREATE TYPE "TopEventStatus" AS ENUM ('PLANNED', 'REGISTRATION_OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TopParticipantType" AS ENUM ('NEW_PARTICIPANT', 'LEGENDARY');
CREATE TYPE "TopParticipantStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "TopServantStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "TopEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "city" TEXT NOT NULL,
  "location" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "TopEventStatus" NOT NULL,
  "representativeLegendaryId" UUID,
  "deputyRepresentativeLegendaryId" UUID,
  "generalCoordinatorLegendaryId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopParticipant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "topEventId" UUID NOT NULL,
  "legendaryId" UUID NOT NULL,
  "type" "TopParticipantType" NOT NULL,
  "status" "TopParticipantStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopServant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "topEventId" UUID NOT NULL,
  "legendaryId" UUID NOT NULL,
  "teamId" UUID,
  "role" TEXT,
  "status" "TopServantStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopServant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopTeam" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "topEventId" UUID NOT NULL,
  "teamId" UUID NOT NULL,
  "coordinatorLegendaryId" UUID,
  "deputyCoordinatorLegendaryId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TopTeam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TopEvent_number_idx" ON "TopEvent"("number");
CREATE INDEX "TopEvent_name_idx" ON "TopEvent"("name");
CREATE INDEX "TopEvent_city_idx" ON "TopEvent"("city");
CREATE INDEX "TopEvent_status_idx" ON "TopEvent"("status");
CREATE INDEX "TopEvent_startDate_idx" ON "TopEvent"("startDate");
CREATE INDEX "TopParticipant_topEventId_idx" ON "TopParticipant"("topEventId");
CREATE INDEX "TopParticipant_legendaryId_idx" ON "TopParticipant"("legendaryId");
CREATE INDEX "TopParticipant_status_idx" ON "TopParticipant"("status");
CREATE INDEX "TopServant_topEventId_idx" ON "TopServant"("topEventId");
CREATE INDEX "TopServant_legendaryId_idx" ON "TopServant"("legendaryId");
CREATE INDEX "TopServant_teamId_idx" ON "TopServant"("teamId");
CREATE INDEX "TopServant_status_idx" ON "TopServant"("status");
CREATE INDEX "TopTeam_topEventId_idx" ON "TopTeam"("topEventId");
CREATE INDEX "TopTeam_teamId_idx" ON "TopTeam"("teamId");

CREATE UNIQUE INDEX "TopEvent_active_number_unique_idx" ON "TopEvent"("number") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "TopParticipant_active_unique_idx" ON "TopParticipant"("topEventId", "legendaryId") WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED';
CREATE UNIQUE INDEX "TopServant_active_unique_idx" ON "TopServant"("topEventId", "legendaryId") WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED';
CREATE UNIQUE INDEX "TopTeam_active_unique_idx" ON "TopTeam"("topEventId", "teamId") WHERE "deletedAt" IS NULL;

ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_representativeLegendaryId_fkey" FOREIGN KEY ("representativeLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_deputyRepresentativeLegendaryId_fkey" FOREIGN KEY ("deputyRepresentativeLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopEvent" ADD CONSTRAINT "TopEvent_generalCoordinatorLegendaryId_fkey" FOREIGN KEY ("generalCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopParticipant" ADD CONSTRAINT "TopParticipant_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopParticipant" ADD CONSTRAINT "TopParticipant_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopServant" ADD CONSTRAINT "TopServant_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopServant" ADD CONSTRAINT "TopServant_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopServant" ADD CONSTRAINT "TopServant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopTeam" ADD CONSTRAINT "TopTeam_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopTeam" ADD CONSTRAINT "TopTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TopTeam" ADD CONSTRAINT "TopTeam_coordinatorLegendaryId_fkey" FOREIGN KEY ("coordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopTeam" ADD CONSTRAINT "TopTeam_deputyCoordinatorLegendaryId_fkey" FOREIGN KEY ("deputyCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
