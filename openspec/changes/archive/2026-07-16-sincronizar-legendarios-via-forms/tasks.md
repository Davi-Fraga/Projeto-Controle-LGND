## 1. Normalização compartilhada (reúso do import dos 226)

- [x] 1.1 Escrever testes que fixam a saída atual de `canonCity`, `cleanPhone`, `cleanLgnd` de `prisma/import-manus.ts` (baseline antes de mover).
- [x] 1.2 Extrair `canonCity`, `cleanPhone`, `cleanLgnd` e um `normalizeName` (NFD/lowercase/trim, alinhado a `normalizeSearch`) para um helper compartilhado — colocado em `packages/shared/src/normalization.ts` (único ponto alcançável por API + script de import) com testes unitários em `apps/api/src/common/normalization/`.
- [x] 1.3 Refatorar `prisma/import-manus.ts` para importar o helper, mantendo o comportamento fixado em 1.1.

## 2. Schema e contratos

- [x] 2.1 Criar migration adicionando ao `Legendary` os campos novos (D7) — SQL em `prisma/migrations/20260709120000_add_legendary_forms_sync_fields/`; todos nuláveis/`@default`. ⚠️ Aplicar com `pnpm db:migrate:dev`/`deploy` quando houver DB (este ambiente não tem Postgres).
- [x] 2.2 Prisma Client regenerado (`prisma generate`, sem DB) e `packages/shared` atualizado com os campos no tipo `Legendary`. Falta rodar `db:migrate:dev` contra um DB real p/ registrar a migration.
- [x] 2.3 Criar o DTO do payload canônico (D8) com `class-validator`; só âncoras de identidade obrigatórias (o pipe global já é whitelist + forbidNonWhitelisted).

## 3. Módulo e webhook de sincronização

- [x] 3.1 Criar módulo `apps/api/src/modules/legendary-forms-sync/` no padrão `social-actions` (controller fino + service + module + DTOs).
- [x] 3.2 Implementar o controller público `POST /legendarios/forms-sync/webhook` reusando a proteção `x-webhook-secret` timing-safe e o limite de payload do webhook de TOP (sem `JwtAuthGuard`).
- [x] 3.3 Registrar o módulo em `app.module.ts` e confirmar que o `RateLimitGuard` global se aplica.

## 4. Regra de upsert (core)

- [x] 4.1 Rejeitar (400) payload sem `lgndNumber` limpo ou sem `fullName` (âncoras de identidade).
- [x] 4.2 Implementar busca por `lgndNumber` limpo e criação quando não existe (`isFromRotaDoCerrado=true`, `status=ACTIVE`).
- [x] 4.3 Implementar atualização quando existe e o nome bate (comparação tolerante via `normalizeName`).
- [x] 4.4 Implementar o caso de conflito número-vs-nome: não sobrescrever identidade, `needsReview=true`, registrar conflito; retornar `result=conflict`.
- [x] 4.5 Implementar last-write-wins e idempotência por `responseId`+`responseTimestamp` (`lastFormsSyncAt`/`formsResponseId`): skip stale e no-op em reenvio (D5).

## 5. Mapeamento, equipe e marcadores

- [x] 5.1 Mapear todos os campos do payload para os campos do `Legendary` conforme a tabela D7 (incluindo `firstTopExternalText`/`firstTopNotes` para "qual TOP subiu").
- [x] 5.2 Vincular equipe: match por nome normalizado com `Team` existente e criar `TeamMembership` ativo sem duplicar; sem match → `needsReview` + equipe crua registrada (não criar `Team`).
- [x] 5.3 Match de igreja e profissão por nome normalizado; **runtime nunca cria `Church`** — sem match → `needsReview` + nome cru preservado (D11). ⚠️ DESVIO de D7: profissão também NÃO é auto-criada (o padrão existente usa `professionId` pré-existente; auto-criar taxonomia de texto livre recriaria a duplicação de cidades/igrejas que o cliente vetou). Sem match → issue + `needsReview`. Confirmar com o cliente.
- [x] 5.4 Aplicar marcadores: `emailConfirmation` divergente → `needsReview`; `isSpiritualLeader=true` → `needsReview`; outros obrigatórios ausentes → validação registrada.

## 6. Auditoria e histórico

- [x] 6.1 Registrar cada sync via `AuditService.create` (`action='forms_sync'`, before/after) e `LegendaryHistory` (`LEGENDARY_CREATED`/`LEGENDARY_UPDATED`, `metadata.source='google-forms'`, `responseId`, `responseTimestamp`, `result`; `occurredAt=responseTimestamp`).
- [x] 6.2 Registrar conflitos e skips (stale/duplicate) de forma rastreável no histórico/metadata.

## 7. Testes

- [x] 7.1 Teste: novo `lgndNumber` cria `Legendary` com marcadores corretos.
- [x] 7.2 Teste: mesmo `lgndNumber` + nome tolerante atualiza (não duplica).
- [x] 7.3 Teste: reenvio do mesmo `responseId` é no-op idempotente.
- [x] 7.4 Teste: resposta com timestamp mais antigo não sobrescreve (skip stale).
- [x] 7.5 Teste: número existe + nome diverge → `needsReview`, sem overwrite.
- [x] 7.6 Teste: equipe conhecida vincula `TeamMembership`; equipe desconhecida → `needsReview` sem falhar.
- [x] 7.7 Teste: normalização (cidade/telefone/número/nome) aplicada; email confirmation divergente → `needsReview`.
- [x] 7.8 Teste: segredo inválido → 401; payload acima do limite → 413; sem `lgndNumber`/`fullName` → 400.

## 8. Dados sensíveis e acesso (Q5 / D12)

- [x] 8.1 Garantir que `email`/`birthDate` são gravados sempre, mas ficam **fora** da seleção de campos das listagens gerais e exportações amplas de legendários.
- [x] 8.2 Expor `email`/`birthDate` apenas na visão administrativa de detalhe do `Legendary`, restrita por escopo via `AccessPolicyService` (só papéis de visibilidade total); adicionar teste de que papel restrito não recebe esses campos.

## 9. UI e Apps Script

- [x] 9.1 Web: badge/filtro de origem Forms e fila de `needsReview` (conflito número-vs-nome, equipe/igreja sem match) em `apps/web/src/features/legendarios` (ou equivalente); não exibir `email`/`birthDate` na listagem.
- [x] 9.2 Escrever o snippet de referência do Apps Script (`onFormSubmit`, `Script Properties`, `x-webhook-secret`, montagem do payload D8, retry por `responseId` sem duplicar) e documentar a configuração.

## 10. Backfill de igrejas (one-off, separado do runtime — D11)

- [x] 10.1 Script one-off idempotente (no espírito de `import-manus.ts`) que extrai as igrejas distintas da planilha do Forms e as normaliza/deduplica por nome.
- [x] 10.2 Emitir a lista normalizada para **revisão humana** (arquivo/print) antes de qualquer insert; não inserir `SELECT DISTINCT` cru.
- [x] 10.3 Após aprovação da lista, inserir/garantir as `Church` de forma idempotente (rodar 2x não duplica); registrar resumo criado × já-existente.
- [x] 10.4 (Q6) Definir a fonte de leitura da planilha para o backfill (export CSV / Sheets API) e documentar.

## 11. Validação final

- [x] 11.1 Testes da API: 194/194 passam (inclui `legendary-forms-sync` service+controller e normalização).
- [x] 11.2 `pnpm -r lint` limpo; `test` verde; build de shared+API limpo. ⚠️ `web build` compila e typa OK (25/25 páginas), mas falha no passo de symlink do output standalone do Next (EPERM — limitação do Windows sem Developer Mode; funciona em Linux/Docker, que é o caminho de produção).
- [x] 11.3 Cenários da spec cobertos por testes automatizados (upsert/conflito/LWW/idempotência/equipe/normalização/sensíveis/secret/size).
- [x] 11.4 ✅ Migration aplicada no Postgres local (`migrate deploy`, 14 colunas confirmadas). End-to-end contra o banco real: 16/16 cenários verdes (criação, upsert, conflito número-vs-nome, last-write-wins, idempotência, equipe Mídia vinculada, igreja/profissão sem match → needsReview, auditoria/histórico com origem google-forms, rejeição de identidade). Harness temporário removido; banco limpo (227 legendários, 0 de teste). NOTA: não depende de TOP — upsert direto de Legendary.
