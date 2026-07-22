-- =============================================================================
-- Pós-check READ-ONLY — change: ajustes-top-familias-historico-servico
-- =============================================================================
-- Rodar APÓS aplicar a migration de expansão (20260722120000). Confirma que a
-- consolidação preservou tudo e que os índices existem. Comparar contra a saída
-- do preview (ajustes-top-familias-preview.sql). Read-only (READ ONLY + ROLLBACK).
--
-- Critérios de sucesso (ver design.md, Fase 1 - validação pós-deploy):
--   [P1] sourcenotes_nao_vazio = 0
--   [P2] total_membros IGUAL ao preview [1].total_membros (nada criado/excluído)
--   [P3] total_linhas / total_ativos / fingerprints IGUAIS ao preview [4]
--   [P4] duplicidades_ativas = 0
--   [P5] os dois índices presentes (histórico + único parcial de serviço ativo)
-- =============================================================================

BEGIN;
SET TRANSACTION READ ONLY;

-- [P1] sourceNotes já consolidado => zero não-vazio.
SELECT
  '[P1] sourcenotes_nao_vazio' AS checagem,
  count(*)                     AS valor,
  (count(*) = 0)               AS ok
FROM "TopFamilyMember"
WHERE btrim(coalesce("sourceNotes", '')) <> '';

-- [P2] Contagem de membros preservada (comparar com preview [1]).
SELECT
  '[P2] total_membros' AS checagem,
  count(*)             AS valor
FROM "TopFamilyMember";

-- [P3] TopServant intacto: total/ativos e fingerprints iguais ao preview [4].
SELECT
  '[P3] topservant' AS checagem,
  count(*)                                                                    AS total_linhas,
  count(*) FILTER (WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED')     AS total_ativos,
  md5(coalesce(string_agg("id"::text, ',' ORDER BY "id"), ''))               AS fingerprint_todos_ids,
  md5(coalesce(string_agg("id"::text, ',' ORDER BY "id")
       FILTER (WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'), ''))  AS fingerprint_ativos_ids
FROM "TopServant";

-- [P4] Nenhuma duplicidade ativa (o índice único parcial garante).
SELECT
  '[P4] duplicidades_ativas' AS checagem,
  count(*)                   AS valor,
  (count(*) = 0)             AS ok
FROM (
  SELECT "topEventId", "legendaryId"
  FROM "TopServant"
  WHERE "deletedAt" IS NULL AND "status" <> 'CANCELLED'
  GROUP BY "topEventId", "legendaryId"
  HAVING count(*) > 1
) dup;

-- [P5] Índices esperados presentes: o de histórico (novo, desta migration) e o
--      único parcial de serviço ativo (PRÉ-EXISTENTE desde 20260527030000_tops_module).
SELECT
  '[P5] indices' AS checagem,
  bool_or(indexname = 'TopServant_legendaryId_status_deletedAt_createdAt_idx') AS tem_indice_historico,
  bool_or(indexname = 'TopServant_active_unique_idx')                          AS tem_unico_parcial_ativo
FROM pg_indexes
WHERE schemaname = current_schema() AND tablename = 'TopServant';

-- [P6] Spot-check: membros com observação mesclada (dois textos separados por \n\n).
SELECT
  '[P6] amostra_mescladas' AS checagem,
  "id"                     AS member_id,
  "notes"
FROM "TopFamilyMember"
WHERE "notes" LIKE '%' || E'\n\n' || '%'
ORDER BY "id"
LIMIT 50;

ROLLBACK;
