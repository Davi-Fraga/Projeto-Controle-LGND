CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "TeamMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED');

CREATE TABLE "Team" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
  "coordinatorLegendaryId" UUID,
  "deputyCoordinatorLegendaryId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMembership" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "teamId" UUID NOT NULL,
  "legendaryId" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "status" "TeamMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Team_name_idx" ON "Team"("name");
CREATE INDEX "Team_status_idx" ON "Team"("status");
CREATE INDEX "Team_coordinatorLegendaryId_idx" ON "Team"("coordinatorLegendaryId");
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");
CREATE INDEX "TeamMembership_legendaryId_idx" ON "TeamMembership"("legendaryId");
CREATE INDEX "TeamMembership_status_idx" ON "TeamMembership"("status");

CREATE UNIQUE INDEX "TeamMembership_active_unique_idx"
  ON "TeamMembership"("teamId", "legendaryId")
  WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Team_active_name_unique_idx"
  ON "Team"(LOWER("name"))
  WHERE "deletedAt" IS NULL;

ALTER TABLE "Team" ADD CONSTRAINT "Team_coordinatorLegendaryId_fkey" FOREIGN KEY ("coordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_deputyCoordinatorLegendaryId_fkey" FOREIGN KEY ("deputyCoordinatorLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
