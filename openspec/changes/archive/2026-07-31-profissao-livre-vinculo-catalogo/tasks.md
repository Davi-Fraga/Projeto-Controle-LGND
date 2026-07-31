## 1. Schema e contrato compartilhado

- [x] 1.1 Adicionar `Legendary.professionText` anulável ao schema Prisma e aos tipos compartilhados, sem remover nem alterar `professionId`/relação atuais — `prisma/schema.prisma` (após `profession`) e `packages/shared/src/index.ts` (`Legendary`).
- [x] 1.2 Criar migration aditiva e idempotente para a nova coluna, acompanhada de comandos documentados de preview/dry-run, backup, validação pós-migration e rollback seguro — `prisma/migrations/20260730120000_add_legendary_profession_text/migration.sql` (`ADD COLUMN IF NOT EXISTS`; queries de validação e regra de rollback no cabeçalho).
- [x] 1.3 Gerar o Prisma Client e validar que a migration preserva a contagem e os IDs de todos os vínculos de profissão existentes em banco de teste com dado legado — **VALIDADO em 30/07 no Postgres DEV local** (`localhost:5433`, `central_da_manada`), com dado legado real: 242 legendários ativos, 65 com `professionId`, 5 profissões distintas, 0 órfãos.
  - `prisma generate` (client v5.22.0) — ok.
  - Preview (somente leitura) → aplicação via **`prisma migrate deploy`** (nunca reseta) → post-check: `total`, `com_vinculo`, `profissoes_distintas` e **fingerprint md5 do conjunto `(id, professionId)` IDÊNTICOS** (`4cddd9c8…b34`); `orfaos` = 0 antes e depois.
  - Coluna criada como esperado: `text`, `is_nullable = YES`, 0 valores.
  - **Rerun seguro comprovado:** reaplicar o `ADD COLUMN IF NOT EXISTS` é no-op (fingerprint e contagens inalterados).
  - **Round-trip da coluna comprovado** (gravar texto livre + zerar vínculo, ler de volta) dentro de transação com **rollback intencional**: nenhum dado de teste ficou no banco (fingerprint pós-rollback idêntico, `com_texto_livre` = 0).
  - ⚠️ **Drift pré-existente do banco local encontrado no caminho (não causado por esta change):** `20260723120000_add_user_scope_policy` estava sem registro em `_prisma_migrations`, embora **todos** os seus objetos já existissem (enum, tabela, 3 índices, FK — batendo 1:1 com o SQL). Falhou com `42710 type already exists` e travou a cadeia. Recuperado com `prisma migrate resolve --applied <nome>` (escreve só em `_prisma_migrations`; não altera schema nem dado). A migration `20260722120000_top_family_notes_merge…` foi aplicada no mesmo `deploy` e foi **no-op de dado aqui** (`TopFamilyMember` com 0 linhas); criou apenas o índice de `TopServant`.

## 2. Resolução única de profissão

- [x] 2.1 Implementar no módulo de profissões um resolvedor público e sem efeitos colaterais que reutilize `normalizeName` e retorne vazio, match único, não encontrado ou ambíguo considerando somente profissões ativas — `ProfessionsService.resolveByName` + tipo `ProfessionResolution`.
- [x] 2.2 Exportar o resolvedor pelo módulo e remover a resolução privada duplicada do `LegendaryFormsSyncService` — `exports: [ProfessionsService]`; `resolveProfessionByName` privado REMOVIDO.
- [x] 2.3 Testar match com caixa/acentos/espaços, texto sem match, colisão normalizada, profissão inativa e garantir que nenhuma operação crie profissão ou alias — `professions.service.spec.ts` (12 testes, verdes).

## 3. API de legendários

- [x] 3.1 Acrescentar `professionText` aos DTOs de criação/atualização e rejeitar payload que defina simultaneamente texto e ID, mantendo `professionId` isolado compatível — `create-legendario.dto.ts` (`UpdateLegendarioDto` herda por `PartialType`); rejeição em `resolveProfessionPatch`.
- [x] 3.2 Aplicar a resolução compartilhada em create/update com semântica distinta para propriedade ausente, vazia, encontrada e pendente — `LegendariosService.resolveProfessionPatch`, aplicado DEPOIS de `toData` em `create`/`update`.
- [x] 3.3 Preservar causas globais de `needsReview`, forçando `true` apenas para profissão não encontrada/ambígua e nunca limpando outras pendências automaticamente — o patch só LIGA `needsReview`; nunca o desliga.
- [x] 3.4 Testar criação e atualização com match, sem match, limpeza explícita, PATCH sem profissão, payload ambíguo e preservação de vínculo legado — `legendarios.service.spec.ts` (8 testes novos; suíte 31/31 verde).

## 4. Forms e reconciliação

- [x] 4.1 Usar o resolvedor compartilhado no sync do Forms e persistir `professionText` quando a profissão não tiver match único — `resolveReferencesAndIssues` devolve `professionText`; `ingest` grava no `data`. Issue nova para o caso ambíguo.
- [x] 4.2 Atualizar a reconciliação de referências para ler/gravar `professionText` e manter o resultado idempotente — `reconcileReferences` inclui a coluna no `select`, na comparação `fieldsChanged` e no `update`.
- [x] 4.3 Testar Forms/reconciliação para match, ausência e ambiguidade, incluindo `needsReview`, histórico da inconsistência e proibição de auto-criação — `legendary-forms-sync.service.spec.ts` (4 testes) + `legendary-forms-sync.aliases.spec.ts` (3 testes de reconciliação, incluindo promoção de texto a vínculo). **Estes testes pegaram um bug real:** `resolveReferencesAndIssues` declarava `professionText` no tipo de retorno mas não o incluía no objeto — como o campo é opcional, o `tsc` não acusou e o texto chegava `null` no `ingest` e na reconciliação. Corrigido.

## 5. Interface e apresentação

- [x] 5.1 Substituir o `<select>` de profissão do formulário de legendário por input de texto livre, inicializado por `profession.name ?? professionText`, e remover o carregamento obrigatório do catálogo nessa tela — `legendario-form.tsx` (`getProfessions()` saiu do `Promise.all`; estado `professions` removido).
- [x] 5.2 Garantir que alterações não relacionadas não sobrescrevam um vínculo legado, inclusive quando a profissão vinculada estiver inativa — flag `professionTouched`: sem edição o campo é OMITIDO do payload; string vazia continua significativa (limpar).
- [x] 5.3 Atualizar perfil e exportação para mostrar `profession.name ?? professionText`, mantendo filtros e relatório agrupado baseados em `professionId` — perfil (`legendarios/[id]/page.tsx`), CSV (`reports.service.exportLegendarios`), `socialInterested` (select) e `flatten` de Relatórios. `byProfession` e o filtro da listagem seguem catalogados.
- [x] 5.4 Adicionar testes de interface/payload e fallback de apresentação para profissão vinculada, livre e ausente — `legendario-form.test.tsx` (10 testes, verdes).

## 6. Validação e rollout

- [x] 6.1 Executar testes unitários e de integração dos módulos afetados, lint, typecheck e build conforme os scripts do repositório — **TODOS VERDES (30/07, reexecutados após o fix da 6.4):** `pnpm --filter api test` **489/489** (43 suítes) · `pnpm --filter web test` **131/131** (31 suítes) · `pnpm lint` (raiz — eslint api + tsc api/web/shared + tsc `prisma/`) verde · `pnpm --filter api build` (nest build) ok. `pnpm --filter web build` não é critério no Windows (EPERM do symlink do `output: standalone`).
- [x] 6.2 Executar migration e smoke tests **no ambiente DEV local com dados representativos** (o projeto não possui homologação: existem apenas `docker-compose.yml` local e `docker-compose.prod.yml` da VPS — nenhuma menção a homologação/staging em `docs/`, `scripts/` ou nos compose; task reescrita em 30/07 para o ambiente real, aprovada pelo Davi), comparando o preview com as checagens pós-migration.
  - **Migration:** coberta pela task 1.3 (preview × post-check com fingerprint idêntico sobre 242 legendários / 65 vínculos reais).
  - **Smoke tests contra o BANCO REAL — 7/7 PASS.** Diferente dos unit tests (Prisma mockado), exercita o stack de verdade: DTO → `LegendariosService` → `ProfessionsService` → Prisma Client tipado → coluna real, usando os **serviços compilados de `apps/api/dist`** (o mesmo artefato que vai a deploy). Cenários: (1) texto sem match preserva o valor aparado + `needsReview`; (2) match normalizado com variação de caixa/espaços vincula e limpa o texto, sem forçar revisão; (3) PATCH não relacionado preserva o vínculo; (4) texto vazio limpa ambos; (5) `professionId` isolado vincula E limpa texto residual (o gap corrigido na 6.4); (6) texto + ID juntos → `BadRequestException`; (7) rollback removeu todo dado de teste.
  - **Segurança:** tudo dentro de UMA transação externa encerrada por rollback intencional (o `$transaction` interno do service é redirecionado para ela por Proxy, mesmo padrão do backfill dry-run). Verificado após o rollback que 0 registros de teste sobreviveram.
  - ⚠️ **Achado do próprio smoke:** na primeira execução o cenário 5 falhou porque `apps/api/dist` estava desatualizado (o build fora feito ANTES do fix da 6.4). Após `pnpm --filter api build`, 7/7. Lição: o smoke valida o artefato compilado, então o build precisa ser posterior ao último fix — documentado no cabeçalho do script.
  - **Repetível por qualquer um** (não foi um one-off): `apps/api/scripts/profissao-livre-check.ts` (preview/post-check, somente leitura) e `apps/api/scripts/profissao-livre-smoke.ts` (smoke transacional), no mesmo padrão dos scripts já existentes em `apps/api/scripts/`. Uso documentado no cabeçalho de cada um.
- [x] 6.3 Registrar evidências de backup verificado, migration aplicada e integridade dos vínculos antes do deploy de produção — **DEPLOY EXECUTADO E VALIDADO em 31/07/2026 ~12:01–12:06 UTC.** PR #40 mesclado (`685144c0`); produção saiu de `6a1c2f6` → `685144c0`.

  **Diagnóstico pré-deploy:** produção em `main`/`6a1c2f6`, 5 containers Up, health `ok/up/up`. Consulta a `_prisma_migrations` confirmou que **`20260722120000_top_family_notes_merge_and_servant_indexes` JÁ ESTAVA APLICADA** — o risco levantado (migration que muta dados) não se materializou; a única pendente era a desta change, aditiva. Nenhuma das 6 últimas migrations estava não-finalizada. `scripts/deploy.sh` e `docker/Caddyfile` fora do diff (33 arquivos), o que neutralizou as duas armadilhas de 29/07 (script que se automodifica no próprio `git pull`; pull recusado por arquivo modificado na VPS).

  **Backup verificado:** `/home/deploy/backups/central-da-manada/backup_20260731-115432.sql`, `-rw-------`, dono `deploy`, **1.508.283 bytes**. As três validações (`test -f`, `test -s`, `stat`) imprimiram — o `< /dev/null` impediu a falha silenciosa do `exec -T` comendo o stdin. Conteúdo não foi lido (dados pessoais).

  **Migration aplicada:** `Applying migration 20260730120000_add_legendary_profession_text` → `All migrations have been successfully applied`. Exatamente uma, a desta change. Tags `central-da-manada-{api,web}:pre-685144c` criadas ANTES do build; `docker image prune -f` → `Total reclaimed space: 0B` (o ponto de retorno sobreviveu). `EXIT_CODE=0`.

  **Integridade dos vínculos — comparação prod-antes × prod-depois (mesma expressão SQL):**

  | | antes | depois |
  |---|---|---|
  | total de legendários ativos | 249 | 249 |
  | com `professionId` | 65 | 65 |
  | profissões distintas | 5 | 5 |
  | fingerprint md5 de `(id, professionId)` | `5327d74e29d5fd6ac7b7c5fdcf1deda7` | `5327d74e29d5fd6ac7b7c5fdcf1deda7` |
  | vínculos órfãos | — | 0 |

  Coluna criada como especificado: `text`, `is_nullable = YES`, `professionText` com 0 valores. **Nenhum vínculo existente foi alterado.**

  **Pós-deploy:** commit implantado confirmado (`685144c0`), health `{"status":"ok","database":"up","redis":"up"}`, site `/login` HTTP 200, 5 containers Up, sem erros nos logs da API. Seed `SEED_MODE=access` sem remoções (a change não toca permissions) — diferente de 29/07, que limpou 5 órfãs.

  **Rollback disponível:** imagens `pre-685144c` (binário) + `backup_20260731-115432.sql` (dado). A coluna pode permanecer em qualquer rollback — a versão anterior da app a ignora; dropá-la perderia textos livres já gravados.
- [x] 6.4 Validar todos os cenários das specs da change e somente então marcar a implementação pronta para archive — **18 cenários percorridos um a um contra o código.** 17 conformes; **1 GAP REAL ENCONTRADO E CORRIGIDO:** o cenário “Legacy client submits catalog ID … **and clears any stale profession fallback text**” não era cumprido — `professionId` isolado gravava o vínculo mas deixava `professionText` pendurado, quebrando a exclusividade mútua dos campos. O teste existente ainda codificava o comportamento errado (`not.toHaveProperty('professionText')`). Corrigido em `resolveProfessionPatch` (ID presente sem texto → `professionText: null`) + 2 testes (create e update). Restam operacionais, fora do controle do código: “Pre-deploy and post-deploy checks are compared” (depende de 6.2/6.3).
