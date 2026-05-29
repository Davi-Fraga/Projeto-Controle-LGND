-- ============================================================================
-- STRATEGY: Table Partitioning for High-Volume Logs
-- Targets: AuditLog, LegendaryHistory
-- Method: Declarative Partitioning by Range (createdAt)
-- ============================================================================

-- 1. AUDIT LOG PARTITIONING
-- Rename existing table to keep data
ALTER TABLE "AuditLog" RENAME TO "AuditLog_old";

-- Create new partitioned table
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "entityType" TEXT,
    "entityId" TEXT,
    "action" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create partitions for 2026 (monthly)
CREATE TABLE "AuditLog_2026_01" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "AuditLog_2026_02" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE "AuditLog_2026_03" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE "AuditLog_2026_04" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE "AuditLog_2026_05" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE "AuditLog_2026_06" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE "AuditLog_2026_07" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE "AuditLog_2026_08" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE "AuditLog_2026_09" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE "AuditLog_2026_10" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE "AuditLog_2026_11" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE "AuditLog_2026_12" PARTITION OF "AuditLog" FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Migration of data
INSERT INTO "AuditLog" SELECT * FROM "AuditLog_old";
DROP TABLE "AuditLog_old";

-- Indices for the partitioned table
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- 2. LEGENDARY HISTORY PARTITIONING
ALTER TABLE "LegendaryHistory" RENAME TO "LegendaryHistory_old";

CREATE TABLE "LegendaryHistory" (
    "id" UUID NOT NULL,
    "legendaryId" UUID NOT NULL,
    "type" TEXT,
    "title" TEXT,
    "description" TEXT,
    "topEventId" UUID,
    "teamId" UUID,
    "topFamilyId" UUID,
    "socialActionId" UUID,
    "actorUserId" UUID,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegendaryHistory_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create partitions for 2026 (monthly)
CREATE TABLE "LegendaryHistory_2026_01" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE "LegendaryHistory_2026_02" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE "LegendaryHistory_2026_03" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE "LegendaryHistory_2026_04" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE "LegendaryHistory_2026_05" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE "LegendaryHistory_2026_06" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE "LegendaryHistory_2026_07" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE "LegendaryHistory_2026_08" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE "LegendaryHistory_2026_09" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE "LegendaryHistory_2026_10" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE "LegendaryHistory_2026_11" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE "LegendaryHistory_2026_12" PARTITION OF "LegendaryHistory" FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Migration of data
INSERT INTO "LegendaryHistory" SELECT * FROM "LegendaryHistory_old";
DROP TABLE "LegendaryHistory_old";

-- Indices for the partitioned table
CREATE INDEX "LegendaryHistory_legendaryId_idx" ON "LegendaryHistory"("legendaryId");
CREATE INDEX "LegendaryHistory_createdAt_idx" ON "LegendaryHistory"("createdAt");
