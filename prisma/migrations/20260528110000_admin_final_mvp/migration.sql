ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'SOCIAL_ACTION_JOINED';
ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'SOCIAL_ACTION_LEFT';
ALTER TYPE "LegendaryHistoryType" ADD VALUE IF NOT EXISTS 'SOCIAL_ACTION_COMPLETED';

CREATE TYPE "InternalMessageStatus" AS ENUM ('DRAFT', 'SENT', 'CANCELLED');
CREATE TYPE "InternalMessageTargetType" AS ENUM ('ALL_ACTIVE_LEGENDARIES', 'TOP_ALL', 'TOP_REPRESENTATIVES', 'TOP_FAMILY_REPRESENTATIVES', 'TOP_FAMILY', 'TEAM', 'TEAM_COORDINATORS', 'LEGENDARY');
CREATE TYPE "MessageRecipientStatus" AS ENUM ('PENDING', 'READ', 'CONFIRMED');
CREATE TYPE "SocialActionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SocialActionParticipantStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "InternalMessage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "InternalMessageStatus" NOT NULL DEFAULT 'DRAFT',
  "targetType" "InternalMessageTargetType" NOT NULL,
  "targetId" UUID,
  "topEventId" UUID,
  "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" UUID NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageRecipient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "messageId" UUID NOT NULL,
  "legendaryId" UUID NOT NULL,
  "userId" UUID,
  "status" "MessageRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "readAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "city" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "SocialActionStatus" NOT NULL DEFAULT 'PLANNED',
  "responsibleLegendaryId" UUID NOT NULL,
  "notes" TEXT,
  "resultSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SocialAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialActionParticipant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "socialActionId" UUID NOT NULL,
  "legendaryId" UUID NOT NULL,
  "role" TEXT,
  "status" "SocialActionParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
  "attended" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SocialActionParticipant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LegendaryHistory" ADD COLUMN "socialActionId" UUID;

CREATE INDEX "InternalMessage_status_idx" ON "InternalMessage"("status");
CREATE INDEX "InternalMessage_targetType_idx" ON "InternalMessage"("targetType");
CREATE INDEX "InternalMessage_targetId_idx" ON "InternalMessage"("targetId");
CREATE INDEX "InternalMessage_topEventId_idx" ON "InternalMessage"("topEventId");
CREATE INDEX "InternalMessage_createdByUserId_idx" ON "InternalMessage"("createdByUserId");
CREATE INDEX "InternalMessage_sentAt_idx" ON "InternalMessage"("sentAt");
CREATE UNIQUE INDEX "MessageRecipient_messageId_legendaryId_key" ON "MessageRecipient"("messageId", "legendaryId");
CREATE INDEX "MessageRecipient_messageId_idx" ON "MessageRecipient"("messageId");
CREATE INDEX "MessageRecipient_legendaryId_idx" ON "MessageRecipient"("legendaryId");
CREATE INDEX "MessageRecipient_userId_idx" ON "MessageRecipient"("userId");
CREATE INDEX "MessageRecipient_status_idx" ON "MessageRecipient"("status");
CREATE INDEX "SocialAction_title_idx" ON "SocialAction"("title");
CREATE INDEX "SocialAction_city_idx" ON "SocialAction"("city");
CREATE INDEX "SocialAction_status_idx" ON "SocialAction"("status");
CREATE INDEX "SocialAction_startDate_idx" ON "SocialAction"("startDate");
CREATE INDEX "SocialAction_responsibleLegendaryId_idx" ON "SocialAction"("responsibleLegendaryId");
CREATE INDEX "SocialActionParticipant_socialActionId_idx" ON "SocialActionParticipant"("socialActionId");
CREATE INDEX "SocialActionParticipant_legendaryId_idx" ON "SocialActionParticipant"("legendaryId");
CREATE INDEX "SocialActionParticipant_status_idx" ON "SocialActionParticipant"("status");
CREATE INDEX "SocialActionParticipant_attended_idx" ON "SocialActionParticipant"("attended");
CREATE INDEX "LegendaryHistory_socialActionId_idx" ON "LegendaryHistory"("socialActionId");
CREATE UNIQUE INDEX "SocialActionParticipant_active_unique_idx" ON "SocialActionParticipant"("socialActionId", "legendaryId") WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED';

ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_topEventId_fkey" FOREIGN KEY ("topEventId") REFERENCES "TopEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InternalMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialAction" ADD CONSTRAINT "SocialAction_responsibleLegendaryId_fkey" FOREIGN KEY ("responsibleLegendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialActionParticipant" ADD CONSTRAINT "SocialActionParticipant_socialActionId_fkey" FOREIGN KEY ("socialActionId") REFERENCES "SocialAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialActionParticipant" ADD CONSTRAINT "SocialActionParticipant_legendaryId_fkey" FOREIGN KEY ("legendaryId") REFERENCES "Legendary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegendaryHistory" ADD CONSTRAINT "LegendaryHistory_socialActionId_fkey" FOREIGN KEY ("socialActionId") REFERENCES "SocialAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
