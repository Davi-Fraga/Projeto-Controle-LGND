## 0. Pré-requisito (aprovação humana) — APROVADO 2026-07-16

- [x] 0.1 D1 aprovado: tabela `ChurchAlias` (unicidade como constraint do banco é o argumento decisivo)
- [x] 0.2 D2 aprovado: `normalizedAlias` UNIQUE + mesma-igreja=no-op + outra-igreja=pular-e-reportar + precedência canônico>alias
- [x] 0.3 D5 aprovado (`--refresh-refs` reusando `resolveChurchByName`; re-run puro pula por idempotência); `source` inicial da curadoria = `curation` (origem humana, mais fiel p/ futura UI)

## 1. Schema + migration

- [x] 1.1 Adicionar o modelo `ChurchAlias` ao `prisma/schema.prisma` (`id`, `churchId` FK→`Church`, `alias`, `normalizedAlias @unique`, `source` default `curation`, `createdAt`) + índice em `churchId` + relação em `Church`
- [x] 1.2 Gerar migration com `pnpm db:migrate:dev` (aditiva, não-destrutiva; não altera as 75 igrejas)
- [x] 1.3 Rodar `pnpm db:generate` e validar que a migration aplica e reverte limpa em banco local

## 2. Resolução por nome-ou-alias (serviço de produção)

- [x] 2.1 Ajustar `resolveChurchByName(name, db?)` em `legendary-forms-sync.service.ts`: normalizar → tentar canônico → se não achar, `ChurchAlias.findUnique({ normalizedAlias })` filtrando igreja não `deletedAt` → retornar `churchId`; sem match → `undefined` (comportamento atual mantido)
- [x] 2.2 Garantir precedência canônico>alias e que é o MESMO caminho para webhook e backfill (nenhuma lógica duplicada)
- [x] 2.3 Testes do resolvedor: match por alias; alias inexistente → `undefined` (needsReview); precedência canônico>alias; alias de igreja soft-deleted não resolve

## 3. Criação de alias + regra de colisão

- [x] 3.1 Implementar criação idempotente de alias (upsert por `normalizedAlias`): mesma igreja → no-op; outra igreja → pular+reportar; normalizado == canônico de outra igreja → pular+reportar
- [x] 3.2 Testes: idempotência (2x não duplica); colisão entre igrejas (preserva vínculo, reporta); alias == canônico de outra igreja (pula)

## 4. Popular aliases a partir da curadoria

- [x] 4.1 No `--apply` de `scripts/backfill-churches-from-forms.ts`, após garantir cada canônico, gravar cada `variant` como alias (exceto `normalize(variant) == normalize(canonical)`), via 3.1, com `source='curation'`
- [x] 4.2 Relatório do `--apply`: aliases criados / já existentes / colisões (por nome canônico, sem PII)
- [x] 4.3 Teste: cluster com canônico + variantes gera os aliases corretos; reexecução não duplica

## 5. Reprocessamento retroativo (rollout)

- [x] 5.1 Implementar passo idempotente de reconciliação de referências (`--refresh-refs` no backfill de legendários ou script dedicado) que reusa `resolveChurchByName`, atualiza `churchId` quando passou a casar por alias e recalcula `needsReview`, sem tocar identidade/`lastFormsSyncAt`/histórico
- [x] 5.2 Teste: legendário antes `needsReview` por igreja passa a casar após alias; reconciliação é idempotente (no-op no 2º run)

## 6. Rollout + verificação

- [x] 6.1 `pnpm -C apps/api lint && pnpm -C apps/api test` verdes
- [x] 6.2 Em banco local: migration → `--apply` das igrejas (grava aliases) → `--refresh-refs` dos legendários; medir a queda do `needsReview` de igreja (baseline: 153 ocorrências)
- [ ] 6.3 Deploy separado do serviço de produção (migration + serviço), fora de outras mudanças
- [x] 6.4 Atualizar a memória de pendência ([[church-profession-alias-pending]]) marcando a parte de igreja como concluída e mantendo a nota de reaproveitamento para profissão

## 7. Ordem de rollout em PRODUÇÃO (obrigatória — diretriz do dono)

> O backfill de legendários em produção NÃO acontece antes dos aliases estarem no ar.

- [ ] 7.1 Deploy da feature de aliases (migration `ChurchAlias` + serviço com resolução nome-ou-alias)
- [ ] 7.2 Popular os aliases da curadoria em produção (`--apply` das igrejas, que grava os aliases)
- [ ] 7.3 **Backup do banco de produção** e só então rodar o backfill de legendários em produção — já com as variantes casando via alias
- [ ] 7.4 Rodar `--refresh-refs` em produção se necessário (para legendários pré-existentes que passaram a casar)
