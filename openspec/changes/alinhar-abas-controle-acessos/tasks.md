## 1. Reconciliação e aval de implementação

- [x] 1.1 Reler `CLAUDE.md`, `docs/architecture.md`, esta change e o estado mais recente de `controle-acessos-por-usuario`, `access-scope-semantics-hardening` e do change proprietário do Organograma antes de alterar código.
- [x] 1.2 Inventariar o diff/worktree atual e identificar sobreposição nos arquivos de catálogo, serviço de acesso, shared e navegação, preservando alterações concorrentes do usuário. (Branch a partir do hardening; overlap reconciliado.)
- [x] 1.3 Confirmar o conjunto VIEW canônico de `org-chart` no estado encontrado e registrar no plano se permanece legado ou já usa `organogram.read`. (LEGADO: teams.read/legendarios.read/tops.read, anyOf.)
- [x] 1.4 Apresentar o plano de implementação com arquivos, ordem, migração/backfill e testes; aguardar aval humano específico antes de implementar. Nenhuma ação Git faz parte deste aval.

## 2. Contrato compartilhado das abas primárias

- [x] 2.1 Criar em `packages/shared` os tipos do manifesto de navegação (`screenId`, rota, rótulo e regra discriminada por permission ou exceção administrativa) sem dependência de React/Next.
- [x] 2.2 Declarar no manifesto as 11 abas concedíveis e a exceção admin-only de Usuários, incluindo `spiritual-leaders.read` e `social-actions.read`.
- [x] 2.3 Implementar helpers puros para testar visibilidade por permissions efetivas e selecionar a primeira rota permitida, com comportamento terminal quando nenhuma existir.
- [x] 2.4 Adicionar testes de unicidade de `screenId`/rota, ordem determinística, visibilidade `allOf`/`anyOf`, exceção `COORDINATION_ADMIN` e seleção de rota inicial.

## 3. Permission, migration e seed idempotentes

- [x] 3.1 Adicionar `spiritual-leaders.read` de forma aditiva e idempotente. DECISÃO APROVADA: permission é DADO → via **seed** (`SEED_MODE=access`), não migration de schema; admin recebe pelo loop de all-permissions.
- [x] 3.2 Garantir no backfill que papel não-admin isolado, `REVOKE churches.read` ou ausência de grant efetivo não criem `GRANT spiritual-leaders.read`.
- [x] 3.3 Atualizar `prisma/seed.ts` para semear a nova permission e o acesso total administrativo sem transformar funções não-admin em fonte de acesso.
- [x] 3.4 Validar em banco de teste/smoke: preservação, ausência de duplicatas e compatibilidade com seed repetido. (Dry-run→apply→re-dry-run: 3→0, idempotente.)

## 4. Catálogo e serviço do Controle de Acessos

- [x] 4.1 Adicionar `spiritual-leaders` ao `SCREEN_CATALOG` como VIEW-only com `spiritual-leaders.read` e `UserScopeType.CHURCH`.
- [x] 4.2 Validar que toda aba concedível possui tela canônica única e regra compatível com seu conjunto VIEW; rejeitar `families`/`users` como telas concedíveis e validar Usuários como exceção administrativa. (Teste de paridade nav-manifest.)
- [x] 4.3 Substituir `SCOPE_REQUIRED_PERMISSION` por elegibilidade derivada das telas efetivamente concedidas e seus `scopeTypes`, preservando validação/normalização da entidade real.
- [x] 4.4 Preservar a independência dos overrides: alterar Líderes Espirituais não altera Igrejas e alterar Igrejas não altera Líderes Espirituais.
- [x] 4.5 Atualizar testes de `screen-catalog` e `AccessControlService` para catálogo completo, VIEW/NONE, normalização EDIT→VIEW, CHURCH com apenas a nova permission, rejeições e auditoria.

## 5. Autorização e escopo da view de Líderes Espirituais

- [x] 5.1 Trocar somente `GET /churches/spiritual-leaders` para `@Permissions('spiritual-leaders.read')`, mantendo os demais endpoints em `churches.*`.
- [x] 5.2 Preservar `CurrentUser` → `resolveScope` → `buildChurchWhere` em `spiritualLeadersView`, sem duplicar service/policy e sem ampliar busca fora do escopo. (Já existente; mantido.)
- [x] 5.3 Testes do controller/guard para permission dedicada, 403 com apenas `churches.read`, 403 de Igrejas com apenas `spiritual-leaders.read` e reavaliação após revogação. (Metadata + PermissionsGuard + smoke 8/8.)
- [x] 5.4 Testes do service para admin irrestrito, uma Igreja permitida, Igreja fora do escopo, busca que não amplia escopo, função `SPIRITUAL_LEADER` vinculada e não-admin sem Igreja retornando vazio. (Cobertos por churches.service.spec `spiritualLeadersView`.)

## 6. Navegação e experiência web

- [x] 6.1 Refatorar o Sidebar para consumir o manifesto compartilhado e anexar ícones por `screenId`, removendo gates por papel das telas concedíveis e preservando a exceção declarada de Usuários.
- [x] 6.2 Corrigir explicitamente os gates de Painel, Ações Sociais, Igrejas, Líderes Espirituais e o estado reconciliado do Organograma; confirmar Usuários como `COORDINATION_ADMIN`-only.
- [x] 6.3 Usar o helper de primeira rota após login e na entrada `/dashboard`; estado “Acesso ainda não configurado” sem loop quando vazio.
- [x] 6.4 Condicionar “Ver legendários” e o link do legendário vinculado em Líderes Espirituais a `legendarios.read`, mantendo os dados autorizados como texto.
- [x] 6.5 Corrigir no painel de Controle de Acessos a mensagem de escopo vazio para não prometer acesso irrestrito. (Já feito no hardening; mantido.)
- [x] 6.6 Testes web para manifesto, Sidebar permission-driven, exceção administrativa de Usuários, landing permitido, estado sem acesso e links cruzados.

## 7. Verificação focada de regras críticas

- [x] 7.1 Testes focados de shared/catálogo/access-control/controller/churches — verdes.
- [x] 7.2 Testes focados do Sidebar, login/landing, Controle de Acessos e página Líderes Espirituais — verdes.
- [x] 7.3 Teste: nenhuma das 11 abas concedíveis ausente do catálogo, usando papel como gate ou permission de outro domínio; Usuários fora do catálogo com gate administrativo. (nav-manifest.spec.)
- [x] 7.4 Teste: `users.read`/`users.update` residual não mostra Usuários, não abre a API e não permite reset de senha. (Sidebar.test + smoke do hardening 403.)
- [x] 7.5 Verificado que ocultar menu não concede segurança: requisições diretas sem permission → 403 (smoke 8/8); consultas autorizadas seguem escopadas.

## 8. Validação integral e smoke

- [x] 8.1 Reconstruir/revalidar `@central-da-manada/shared`; `pnpm --filter api build` — ok.
- [x] 8.2 `pnpm --filter api test` — 380 testes, verdes.
- [x] 8.3 `pnpm --filter web test` — 107 testes, verdes.
- [x] 8.4 `pnpm -r lint` — verde (web build standalone symlink não é critério no Windows).
- [x] 8.5 Smoke ao vivo: spiritual-leaders.read → view 200/`/churches` 403; churches.read → `/churches` 200/view 403; `/auth/me` dedicado; CHURCH só com Líderes 201. **8/8 PASS**.
- [x] 8.6 `openspec validate alinhar-abas-controle-acessos` — valid; cenários WHEN/THEN revisados.

## 9. Entrega

- [x] 9.1 Revisar o diff final: sem expansão de escopo, sem arquivos locais de IA, sem segredos.
- [ ] 9.2 Git (commit/push/PR empilhado) — somente com aval explícito do Davi na mesma interação.
