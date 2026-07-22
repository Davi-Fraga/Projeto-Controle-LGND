-- =============================================================================
-- Migration de EXPANSÃO (Fase 1) — change: ajustes-top-familias-historico-servico
-- =============================================================================
-- Aplica-se via `prisma migrate deploy` (roda em transação única). Idempotente:
-- pode ser reexecutada com segurança. NÃO remove colunas nem contratos (a remoção
-- de `sourceNotes` é Fase 2, em migration separada, após janela de observação).
--
-- PRÉ-REQUISITO OPERACIONAL (ver design.md / preview):
--   * Rodar `ajustes-top-familias-preview.sql` e revisar a amostra divergente [3].
--   * Se houver duplicidade ativa de TopServant [5], a criação do índice único
--     parcial abaixo FALHA e a migration inteira é revertida (bloqueio desejado).
--   * Backup `pg_dump` verificável antes de aplicar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [3.1] Consolida `sourceNotes` em `notes` (observação única), pela tabela de
--       decisão do design. A ORDEM importa: primeiro mescla (lê sourceNotes),
--       depois zera sourceNotes. Reexecução é segura pois após zerar, o ramo
--       "sourceNotes vazio => trim(notes)" mantém o valor já consolidado.
--
--   ambos vazios      -> NULL
--   somente notes     -> trim(notes)
--   somente source    -> trim(sourceNotes)
--   iguais após trim  -> uma cópia
--   diferentes        -> trim(notes) + "\n\n" + trim(sourceNotes)   (sem prefixos)
-- -----------------------------------------------------------------------------
UPDATE "TopFamilyMember"
SET "notes" = CASE
  WHEN btrim(coalesce("notes", '')) = '' AND btrim(coalesce("sourceNotes", '')) = '' THEN NULL
  WHEN btrim(coalesce("sourceNotes", '')) = '' THEN btrim("notes")
  WHEN btrim(coalesce("notes", '')) = '' THEN btrim("sourceNotes")
  WHEN btrim("notes") = btrim("sourceNotes") THEN btrim("notes")
  ELSE btrim("notes") || E'\n\n' || btrim("sourceNotes")
END;

-- Zera sourceNotes após a cópia (coluna permanece para rollback da Fase 1).
UPDATE "TopFamilyMember"
SET "sourceNotes" = NULL
WHERE "sourceNotes" IS NOT NULL;

-- -----------------------------------------------------------------------------
-- [3.2] Índice de leitura do histórico de serviço por Legendário/status/data.
--       Nome alinhado à convenção do Prisma para o `@@index` correspondente em
--       schema.prisma (evita drift em `prisma migrate`).
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "TopServant_legendaryId_status_deletedAt_createdAt_idx"
  ON "TopServant" ("legendaryId", "status", "deletedAt", "createdAt");

-- -----------------------------------------------------------------------------
-- [3.3] Índice ÚNICO PARCIAL de serviço ATIVO por (topEventId, legendaryId):
--       *** JÁ EXISTE *** desde a migration original `20260527030000_tops_module`
--       (`TopServant_active_unique_idx`), com colunas e condição IDÊNTICAS
--       (deletedAt IS NULL AND status <> 'CANCELLED'), alinhado a
--       `ensureServantAvailable`. A auditoria do design não o detectou; a
--       validação no banco dev revelou. Portanto NADA a criar aqui — a regra
--       "no máximo um serviço ativo por TOP/Legendário" já é garantida pelo
--       índice existente. Não duplicamos o índice.
-- -----------------------------------------------------------------------------
