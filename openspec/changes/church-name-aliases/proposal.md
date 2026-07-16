## Why

O serviço `legendary-forms-sync` casa igreja por **nome normalizado exato**. As igrejas foram cadastradas com nomes canônicos limpos (ex.: `Primeira Igreja Batista (PIB) — Caldas Novas`), mas as pessoas escrevem dezenas de variantes (`PIB`, `Primeira Batista`, `PIB Caldas Novas`). Essas variantes não casam com o canônico e caem em `needsReview` — no último backfill isso deixou **153 ocorrências** de "igreja sem match". Falta um mecanismo de **alias** (apelido) ligando variantes ao canônico, aplicável tanto ao webhook do Forms ao vivo quanto ao backfill.

## What Changes

- Cada `Church` canônica passa a poder ter **N apelidos (aliases)**.
- A resolução de nome de igreja passa a casar por **nome canônico OU qualquer alias**, sempre por **nome normalizado** (reusando `normalizeName` — sem segundo mecanismo). Match por alias vincula ao canônico; sem match, mantém o comportamento atual (`needsReview`, **nunca** cria igreja no runtime).
- **Mesmo caminho de resolução** para o webhook ao vivo e para o backfill — uma lógica só, sem divergência.
- O `--apply` do backfill de igrejas passa a **popular os aliases** a partir das `variants` de cada canônico em `prisma/data/churches-curation.json`, de forma **idempotente**.
- **Regra de colisão de alias** definida (o mesmo apelido não pode vincular a duas igrejas diferentes) — ver `design.md`.
- Aliases são criados **apenas por curadoria/backfill**, nunca automaticamente pelo webhook.
- **Rollout retroativo**: após criar os aliases, re-rodar o backfill de legendários (idempotente) faz as variantes casarem retroativamente, reduzindo o `needsReview` de igreja.
- **Decisão de modelagem** (`aliases String[]` em `Church` vs tabela dedicada `ChurchAlias`) apresentada no `design.md` com recomendação, para aprovação humana antes de codar.
- Nota de design (sem implementar): o mesmo padrão deverá servir para **profissão** depois — não fechar portas.

## Capabilities

### New Capabilities
- `church-aliases`: modelagem e gestão de apelidos de igreja; resolução de nome de igreja por nome-ou-alias (normalizado) usada pelo sync; população idempotente de aliases a partir da curadoria; regra de colisão; garantia de que aliases nunca são criados automaticamente no runtime.

### Modified Capabilities
<!-- Nenhuma capability de spec principal muda seus requisitos aqui. O serviço
     legendary-forms-sync passa a delegar a resolução de igreja à nova capability
     church-aliases, mas seu contrato observável (sem match -> needsReview; nunca
     cria igreja no runtime) permanece o mesmo. -->

## Impact

- **Schema/DB**: nova coluna `aliases String[]` **ou** nova tabela `ChurchAlias` (decisão no design). Migration **idempotente e não-destrutiva** sobre as 75 igrejas existentes.
- **Serviço de produção**: `resolveChurchByName` (e equivalentes) em `apps/api/src/modules/legendary-forms-sync/legendary-forms-sync.service.ts` passa a casar por nome-ou-alias. Muda o serviço de sincronização — **deploy separado**, com testes.
- **Scripts**: `scripts/backfill-churches-from-forms.ts` (`--apply`) grava aliases a partir de `churches-curation.json`; `apps/api/scripts/backfill-legendaries-from-forms.ts` é re-executado (idempotente) no rollout.
- **Normalização**: reusa `normalizeName` de `@central-da-manada/shared` (sem novo mecanismo).
- **Futuro (fora de escopo)**: padrão reaproveitável para aliases de profissão e uma UI de admin para gerenciar apelidos.
