-- =============================================================================
-- Preview READ-ONLY — change: ajustes-top-familias-historico-servico (Fase 0)
-- =============================================================================
-- Objetivo: coletar EVIDÊNCIA de deploy antes da migration de expansão.
-- NÃO altera dados. Envolto em transação READ ONLY + ROLLBACK: qualquer tentativa
-- de escrita aborta a transação. Rode em cópia representativa/produção e ANEXE a
-- saída ao handoff de deploy.
--
-- Uso (psql):
--   psql "$DATABASE_URL" -f apps/api/scripts/ajustes-top-familias-preview.sql
--
-- BLOQUEIOS de go/no-go (ver design.md, Fase 0):
--   * Query [5] duplicidades ativas de TopServant por (topEventId, legendaryId) > 0
--     => PARE. A migration não escolhe/apaga linha automaticamente; resolução manual.
--   * Query [3] amostra de observações divergentes não revisada => PARE.
--
-- Nomes: sem @@map no schema, então tabelas = nomes dos models e colunas camelCase
-- (aspas duplas obrigatórias no Postgres).
-- =============================================================================

BEGIN;
SET TRANSACTION READ ONLY;

-- -----------------------------------------------------------------------------
-- [1] TopFamilyMember: distribuição das combinações notes/sourceNotes.
--     n = trim(notes), s = trim(sourceNotes). Espelha a tabela de decisão do design.
-- -----------------------------------------------------------------------------
SELECT
  '[1] combinacoes_notes_sourcenotes'                                       AS relatorio,
  count(*)                                                                  AS total_membros,
  count(*) FILTER (WHERE n = '' AND s = '')                                 AS ambos_vazios,
  count(*) FILTER (WHERE n <> '' AND s = '')                                AS somente_notes,
  count(*) FILTER (WHERE n = '' AND s <> '')                                AS somente_sourcenotes,
  count(*) FILTER (WHERE n <> '' AND s <> '' AND n = s)                     AS ambos_iguais,
  count(*) FILTER (WHERE n <> '' AND s <> '' AND n <> s)                    AS ambos_diferentes
FROM (
  SELECT
    btrim(coalesce("notes", ''))       AS n,
    btrim(coalesce("sourceNotes", '')) AS s
  FROM "TopFamilyMember"
) t;

-- -----------------------------------------------------------------------------
-- [2] Baseline de sourceNotes não-vazio (deve ir a ZERO após a migration de
--     expansão — usar como validação pós-deploy).
-- -----------------------------------------------------------------------------
SELECT
  '[2] sourcenotes_nao_vazio_baseline' AS relatorio,
  count(*)                             AS total_sourcenotes_nao_vazio
FROM "TopFamilyMember"
WHERE btrim(coalesce("sourceNotes", '')) <> '';

-- -----------------------------------------------------------------------------
-- [3] Amostra IDENTIFICADA dos casos "ambos diferentes" (para revisão humana).
--     A concatenação futura preserva os dois textos (notes + \n\n + sourceNotes).
--     REVISAR antes do deploy. Limite alto o suficiente p/ auditar; ajuste se preciso.
-- -----------------------------------------------------------------------------
SELECT
  '[3] amostra_divergentes' AS relatorio,
  "id"                      AS member_id,
  "topEventId",
  "topFamilyId",
  "notes",
  "sourceNotes"
FROM "TopFamilyMember"
WHERE btrim(coalesce("notes", '')) <> ''
  AND btrim(coalesce("sourceNotes", '')) <> ''
  AND btrim("notes") <> btrim("sourceNotes")
ORDER BY "id"
LIMIT 500;

-- -----------------------------------------------------------------------------
-- [4] TopServant: contagens totais e fingerprint de ids (comparar pré/pós-deploy).
--     A migration NÃO copia nem move TopServant; total/ids devem ser idênticos depois.
-- -----------------------------------------------------------------------------
SELECT
  '[4] topservant_totais_e_fingerprint'                                       AS relatorio,
  count(*)                                                                    AS total_linhas,
  count(*) FILTER (WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED')     AS total_ativos,
  md5(coalesce(string_agg("id"::text, ',' ORDER BY "id"), ''))               AS fingerprint_todos_ids,
  md5(coalesce(string_agg("id"::text, ',' ORDER BY "id")
       FILTER (WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'), ''))  AS fingerprint_ativos_ids
FROM "TopServant";

-- -----------------------------------------------------------------------------
-- [5] *** BLOQUEIO *** Duplicidades ATIVAS de serviço por (topEventId, legendaryId).
--     Se retornar QUALQUER linha, o índice único parcial não pode ser criado e o
--     deploy PARA. Resolver manualmente (auditado); nunca apagar automaticamente.
-- -----------------------------------------------------------------------------
SELECT
  '[5] duplicidades_ativas_topservant' AS relatorio,
  "topEventId",
  "legendaryId",
  count(*)                             AS ativos_no_mesmo_top,
  array_agg("id" ORDER BY "id")        AS servant_ids
FROM "TopServant"
WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'
GROUP BY "topEventId", "legendaryId"
HAVING count(*) > 1
ORDER BY count(*) DESC, "topEventId", "legendaryId";

-- -----------------------------------------------------------------------------
-- [6] TopServant ativo: distribuição por Legendário (quantos TOPs cada um serviu).
-- -----------------------------------------------------------------------------
SELECT
  '[6] topservant_ativos_por_legendario' AS relatorio,
  servicos_ativos,
  count(*)                               AS qtd_legendarios
FROM (
  SELECT "legendaryId", count(*) AS servicos_ativos
  FROM "TopServant"
  WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'
  GROUP BY "legendaryId"
) t
GROUP BY servicos_ativos
ORDER BY servicos_ativos;

-- -----------------------------------------------------------------------------
-- [7] TopServant ativo: distribuição por TOP.
-- -----------------------------------------------------------------------------
SELECT
  '[7] topservant_ativos_por_top' AS relatorio,
  "topEventId",
  count(*)                        AS servos_ativos
FROM "TopServant"
WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'
GROUP BY "topEventId"
ORDER BY count(*) DESC;

-- -----------------------------------------------------------------------------
-- [8] Referências órfãs — DEVEM ser 0 (garantidas pelas FKs). Confere integridade.
-- -----------------------------------------------------------------------------
SELECT
  '[8] orfaos'                                                                       AS relatorio,
  (SELECT count(*) FROM "TopServant" s
     WHERE NOT EXISTS (SELECT 1 FROM "TopEvent" e WHERE e."id" = s."topEventId"))    AS servant_sem_top,
  (SELECT count(*) FROM "TopServant" s
     WHERE NOT EXISTS (SELECT 1 FROM "Legendary" l WHERE l."id" = s."legendaryId"))  AS servant_sem_legendario,
  (SELECT count(*) FROM "TopServant" s
     WHERE s."teamId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "Team" tm WHERE tm."id" = s."teamId"))          AS servant_com_team_invalida,
  (SELECT count(*) FROM "TopFamilyMember" m
     WHERE NOT EXISTS (SELECT 1 FROM "TopParticipant" p WHERE p."id" = m."topParticipantId")) AS member_sem_participante,
  (SELECT count(*) FROM "TopFamilyMember" m
     WHERE NOT EXISTS (SELECT 1 FROM "TopFamily" f WHERE f."id" = m."topFamilyId"))  AS member_sem_familia,
  (SELECT count(*) FROM "TopFamilyMember" m
     WHERE NOT EXISTS (SELECT 1 FROM "TopEvent" e WHERE e."id" = m."topEventId"))    AS member_sem_top;

ROLLBACK;
