-- AlterTable: campos coletados pelo Google Forms da manada (sincronização contínua).
-- Todos nuláveis ou com DEFAULT → seguros para as linhas já existentes.
-- Ver openspec change `sincronizar-legendarios-via-forms` (design D7).
ALTER TABLE "Legendary" ADD COLUMN "email" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Legendary" ADD COLUMN "district" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "state" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "spiritualLeaderName" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "spiritualLeaderPhone" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "skillsText" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "relativeName" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "relativePhone" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "relativeEmail" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "isSpiritualLeader" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Legendary" ADD COLUMN "leadershipRole" TEXT;
ALTER TABLE "Legendary" ADD COLUMN "lastFormsSyncAt" TIMESTAMP(3);
ALTER TABLE "Legendary" ADD COLUMN "formsResponseId" TEXT;

-- CreateIndex: lookup de idempotência por resposta do Forms
CREATE INDEX "Legendary_formsResponseId_idx" ON "Legendary"("formsResponseId");
