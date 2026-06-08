-- Alinha o banco ao schema.prisma (drift pré-existente). Não altera dados.
-- Apenas aditivo: cria os índices compostos declarados no schema e ajusta o
-- on-delete da FK de TopFamily.representativeLegendaryId para SET NULL,
-- consistente com as demais relações opcionais de Legendary.

-- CreateIndex
CREATE INDEX "LegendaryHistory_legendaryId_occurredAt_idx" ON "LegendaryHistory"("legendaryId", "occurredAt");

-- CreateIndex
CREATE INDEX "MessageRecipient_messageId_status_idx" ON "MessageRecipient"("messageId", "status");

-- CreateIndex
CREATE INDEX "SocialActionParticipant_socialActionId_status_idx" ON "SocialActionParticipant"("socialActionId", "status");

-- CreateIndex
CREATE INDEX "TopFamilyMember_topEventId_topFamilyId_idx" ON "TopFamilyMember"("topEventId", "topFamilyId");

-- CreateIndex
CREATE INDEX "TopParticipant_topEventId_legendaryId_idx" ON "TopParticipant"("topEventId", "legendaryId");

-- DropForeignKey
ALTER TABLE "TopFamily" DROP CONSTRAINT "TopFamily_representativeLegendaryId_fkey";

-- AddForeignKey
ALTER TABLE "TopFamily" ADD CONSTRAINT "TopFamily_representativeLegendaryId_fkey" FOREIGN KEY ("representativeLegendaryId") REFERENCES "Legendary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
