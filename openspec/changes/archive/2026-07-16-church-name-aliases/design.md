## Context

`legendary-forms-sync` resolve igreja em `resolveChurchByName(name)`: carrega as igrejas ativas, normaliza `name` com `normalizeName` e compara por igualdade exata do nome normalizado. Igrejas foram cadastradas com **canônicos limpos**; as respostas trazem **variantes** de grafia que não casam → `needsReview` (153 ocorrências no último backfill). A curadoria já produziu, em `prisma/data/churches-curation.json`, para cada canônico a lista de `variants`. Falta ligar variante → canônico.

Restrições: reusar `normalizeName` (sem 2º mecanismo); migration idempotente e não-destrutiva sobre as 75 igrejas; **um único caminho** de resolução para webhook ao vivo e backfill; aliases nunca criados automaticamente no runtime.

## Goals / Non-Goals

**Goals:**
- Cada `Church` pode ter N aliases; resolução casa por canônico **ou** alias, por nome normalizado.
- Mesmo `resolveChurchByName` para webhook e backfill.
- Popular aliases a partir da curadoria, idempotente.
- Regra de colisão que impede vínculo errado.
- Rollout retroativo que de fato reduz o `needsReview` de igreja.

**Non-Goals:**
- UI de admin para gerenciar aliases (só não fechar portas).
- Aliases de profissão (só nota de design).
- Criação automática de igreja/alias no runtime (permanece proibido — D11).
- Fuzzy matching (continua match exato pós-normalização).

## Decisions

### D1 — Modelagem: tabela `ChurchAlias` (RECOMENDADA) vs `aliases String[]` em `Church`  · **requer sua aprovação**

**Opção A — `aliases String[]` em `Church`:**
- Prós: migration trivial (1 coluna); tudo na mesma linha; leitura simples.
- Contras: **não dá para garantir unicidade global do alias** entre igrejas no nível do banco (array escalar não aceita unique cross-row simples) → a regra de colisão vira só checagem de aplicação, sujeita a corrida; **sem lugar para metadados** (origem, data, quem criou); comparação normalizada exige normalizar em memória ou índice funcional GIN sobre o array (desajeitado); CRUD por-alias para a futura UI é canhoto.

**Opção B — tabela `ChurchAlias` (`id`, `churchId` FK, `alias`, `normalizedAlias` @unique, `source`, `createdAt`):**
- Prós: a **UNIQUE em `normalizedAlias` É a regra de colisão** (garantia do banco, não só da aplicação); metadados (`source: curation|backfill|admin`, `createdAt`) para proveniência e futura UI; `normalizedAlias` indexado → lookup normalizado O(1) via `findUnique`; upsert idempotente por `normalizedAlias`; CRUD por-alias limpo; espelha o padrão que reaproveitaremos para profissão.
- Contras: +1 tabela e +1 query/join na resolução; um pouco mais de código; migration cria tabela + FK.

**Recomendação: Opção B (`ChurchAlias`).** A unicidade da colisão como constraint de banco e o espaço para metadados/UI/proveniência superam o custo de uma query extra. `normalizedAlias` é gravado no write com `normalizeName` (mesmo mecanismo), servindo de índice de lookup e de guarda de colisão.

### D2 — Regra de colisão e ambiguidade · **requer sua aprovação**

Com `ChurchAlias.normalizedAlias @unique` (global):
- **Criar alias já existente para a MESMA igreja** → no-op idempotente (rodar de novo não duplica).
- **Criar alias que já existe para OUTRA igreja** → **colisão**: não sobrescreve, **pula e reporta** (por nomes canônicos, sem PII). Vale o primeiro vínculo; o curador decide. (Reatribuir em silêncio criaria vínculo errado; abortar o lote inteiro seria frágil.)
- **Alias cujo normalizado é igual ao nome canônico de OUTRA igreja** → pula e reporta (redundante/ambíguo; o canônico já resolve).
- **Precedência na resolução**: canônico primeiro, alias depois. Assim, mesmo que um alias colida com o canônico de outra igreja, **o canônico vence** e nunca gera vínculo errado.

Resultado: um alias resolve para **no máximo uma** igreja; ambiguidade nunca vira vínculo automático — vira relatório de curadoria (e a resposta segue `needsReview` até resolver).

### D3 — Caminho único de resolução (webhook = backfill)

`resolveChurchByName(name, db?)` passa a: normalizar → tentar canônico (como hoje) → se não achar, `ChurchAlias.findUnique({ normalizedAlias })` filtrando igreja não `deletedAt` → retornar `churchId`. Sem match → `undefined` (comportamento atual: `needsReview`, nunca cria). Como o backfill já chama `service.ingest` → `resolveChurchByName`, **é a mesma função** para os dois fluxos — nenhuma lógica duplicada.

### D4 — Popular aliases a partir da curadoria (idempotente)

No `--apply` de `scripts/backfill-churches-from-forms.ts`, após garantir cada canônico: para cada `variant` do cluster, `normVar = normalizeName(variant)`; se `normVar === normalizeName(canonical)` pula (o canônico não é alias); senão upsert por `normalizedAlias` seguindo D2. Idempotente por `normalizedAlias` (rodar 2x não duplica). Relatório final: aliases criados, já existentes, colisões (por canônico).

### D5 — Reprocessamento retroativo · **atenção: re-run ingênuo NÃO reresolve**

Ponto sutil: re-rodar o backfill de legendários **como está** NÃO recasa a igreja — a idempotência (`skipped/duplicate` por `responseId`, `skipped/stale` por `lastFormsSyncAt`) faz as linhas já aplicadas serem puladas **antes** de resolver referências. Então um re-run puro não reduz o `needsReview`.

**Solução:** um passo idempotente de **reconciliação de referências** que reusa `resolveChurchByName` (mesmo resolvedor), sem mexer em identidade nem LWW:
- Modo `--refresh-refs` no backfill de legendários (ou script dedicado) que, por linha da planilha, resolve igreja/equipe/profissão **agora** e, se o `churchId` antes nulo passou a casar via alias, atualiza `churchId` e **recalcula `needsReview`** — sem tocar nome/`lastFormsSyncAt`/histórico de identidade.
- Idempotente: rodar de novo quando já casado = no-op.
- **Não altera o caminho do webhook ao vivo** (que segue com `ingest` completo). A reconciliação chama o **mesmo** `resolveChurchByName`, então não há divergência de regra de match.

### D6 — Soft delete

Aliases de igreja `deletedAt != null` não resolvem (join filtra igreja ativa). Aliases acompanham a igreja; não há soft delete próprio de alias nesta versão (remoção é hard delete via curadoria/futura UI).

### D7 — Reaproveitamento para profissão (nota, sem implementar)

`ProfessionAlias` espelharia `ChurchAlias` (mesma forma: `normalizedAlias @unique`, `source`, resolução canônico-ou-alias em `resolveProfessionByName`). Manter os nomes/estrutura genéricos o suficiente para copiar o padrão sem refatorar. Fora de escopo agora.

## Risks / Trade-offs

- **Re-run ingênuo não reduz needsReview** → mitigação: passo `--refresh-refs` (D5), documentado no rollout; sem ele, o retroativo não acontece.
- **Colisão silenciosa criaria vínculo errado** → mitigação: `normalizedAlias @unique` + pular-e-reportar (D2); precedência canônico>alias.
- **Query extra na resolução do webhook** → mitigação: lookup por índice único (`findUnique`), custo O(1); só ocorre quando o canônico não casa.
- **Mudança em serviço de produção** → mitigação: change isolada, testes (match por alias, inexistente→needsReview, idempotência, colisão), **deploy separado**.
- **Alias apontando para igreja soft-deleted** → mitigação: join filtra `deletedAt null` na resolução.

## Migration Plan

1. Migration aditiva `db:migrate:dev`: cria `church_alias` (`id uuid pk`, `church_id uuid` FK→`church(id)`, `alias text`, `normalized_alias text unique`, `source text default 'curation'`, `created_at timestamptz default now()`), índice em `church_id`. Não altera linhas existentes → segura para as 75 igrejas.
2. Ajustar `resolveChurchByName` (D3) + testes.
3. `--apply` das igrejas grava aliases da curadoria (D4).
4. Rollout retroativo: rodar `--refresh-refs` dos legendários (D5) e conferir a queda do `needsReview` de igreja.
5. Rollback: `church_alias` é aditiva; reverter = dropar a tabela e reverter o serviço. Dados de legendário não são afetados destrutivamente.

## Open Questions

1. **Aprovar D1** (tabela `ChurchAlias` vs `String[]`).
2. **Aprovar D2** (regra de colisão: unique + pular-e-reportar + precedência canônico>alias).
3. Confirmar o mecanismo de retroativo em D5 (`--refresh-refs` reusando `resolveChurchByName`) — já que o re-run puro não basta.
4. `source` inicial dos aliases da curadoria: `backfill` (sugerido) vs `curation`.
