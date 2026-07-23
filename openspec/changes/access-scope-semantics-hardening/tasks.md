## 1. Segurança — escalonamento de privilégio (em produção)

- [x] 1.1 Escrever teste (Jest) que prova: não-admin com `users.update` recebe 403 em rotas `/access-control/**` (falha hoje).
- [x] 1.2 Trocar a guarda de `access-control.controller.ts` para exigir papel `COORDINATION_ADMIN` (RolesGuard), removendo `@Permissions('users.update')`.
- [x] 1.3 Confirmar `/users/**` (exceto `/users/me`) já exige papel admin; garantir cobertura de teste.
- [x] 1.4 Rodar `pnpm --filter api test` do módulo e confirmar 403 esperado + admin OK.

## 2. Segurança — IDOR em Igrejas

- [x] 2.1 Escrever teste: `GET /churches/:id` e `PATCH /churches/:id` fora do escopo → 404/403 (falha hoje).
- [x] 2.2 Aplicar escopo em `ChurchesService.findOne` (usar `buildChurchWhere` + `id`), retornando 404 fora do escopo.
- [x] 2.3 Aplicar escopo em `ChurchesService.update` (checar a igreja-alvo contra o escopo antes de alterar).
- [x] 2.4 Verde nos testes do módulo churches.

## 3. Segurança — unificar `assert*Allowed` em fail-closed

- [x] 3.1 Escrever testes: `GET /tops/:id` (e sub-recursos) sem escopo de TOP → 403; `GET /org-chart/coordinators` e cidades/equipe sem escopo → negado/escopado (falham hoje).
- [x] 3.2 Ajustar `AccessPolicyService` para que não-admin seja "restrito" mesmo sem escopo do tipo — `assertCity/Team/Church/TopAllowed` passam a negar quando não há escopo daquele tipo.
- [x] 3.3 Revisar todos os chamadores de `assert*Allowed` (TopScopeGuard, org-chart.service, management.service) e o `org-chart/coordinators` (escopar) para o novo comportamento.
- [x] 3.4 Garantir que admin e usuários com escopo correto NÃO regridem (testes de não-regressão).

## 4. Semântica única fail-closed (consolidação)

- [x] 4.1 Escrever/ajustar testes de `access-policy.service.spec.ts` cobrindo a matriz: sem escopo, escopo que não casa, admin — para cada tipo, em `build*Where` e `assert*Allowed`.
- [x] 4.2 Confirmar que `build*Where` permanece fail-closed e alinhado aos guards (uma só semântica).
- [x] 4.3 Documentar no código (comentário curto) a regra única de escopo vazio.

## 5. Dashboard — permissão por contador + escopo total

- [x] 5.1 Escrever testes (`dashboard.service.spec.ts`): usuário sem `tops.read` não recebe contagem de TOPs/Famílias; `Expertises` não vaza global; contador com escopo vazio = 0; admin = global.
- [x] 5.2 Reescrever `DashboardService.summary` para checar permissão de tela por contador (omitir/zerar sem permissão) e aplicar escopo em todos, incluindo `Expertises`.
- [x] 5.3 Definir contrato do payload (campo `null` = sem permissão; `0` = escopo vazio).
- [x] 5.4 Front `app/dashboard/page.tsx`: gating de cada card por `hasPermission` (usabilidade; backend é a barreira).
- [x] 5.5 Testes de front (Vitest) para os cards gated.

## 6. Concessão — exigir escopo em tela escopável (UI + backend)

- [x] 6.1 Backend: `getUserScreenAccess` marca tela escopável concedida sem escopo como estado inválido (`scopeMissing`); telas globais isentas (`scopeTypes: []`).
- [x] 6.2 Front `features/access-control`: destacar telas escopáveis sem escopo (badge + aviso, corrigindo o texto antigo "acesso a tudo"); orientar a adicionar escopo. (Bloqueio duro é inviável pela ordem grant→scope; ver nota de design no spec.)
- [x] 6.3 Testes: backend `scopeMissing` (Igrejas EDIT sem escopo = true, com escopo/Painel = false); front destaca e orienta; tela global não sinaliza.

## 7. Higiene do catálogo (telas fantasma/incoerentes)

- [x] 7.1 Remover a tela `families` do `SCREEN_CATALOG`; ajustar `screen-catalog.spec.ts`.
- [x] 7.2 Avaliado: NÃO remover `families.*` do seed (upsert nunca apaga; permissions ficam como dead data inofensivo). A remoção da tela do catálogo já resolve o fantasma; mexer no seed adicionaria risco de deploy sem ganho funcional.
- [x] 7.3 Remover a tela `users` do catálogo — administração é role-gated; `users.update` (password-reset) deixa de ser concedível por tela (fecha vetor de escalonamento).
- [x] 7.4 Confirmado: gerenciamento de famílias segue via tela TOPs (`tops.families.*` concedível; teste do catálogo cobre).

## 8. Testes de escopo/IDOR por tela (transversal)

- [x] 8.1 Consolidar uma suíte por tela cobrindo: sem escopo (vê nada), escopo que não casa, id fora do escopo → 403/404, criar/excluir só admin.
- [x] 8.2 Cobrir Legendários (findOne 404 fora do escopo, já existia), Equipes/TOPs/Organograma (guards), Igrejas (IDOR novo), Ações Sociais (novo), Mapa (novo), Relatórios (já existia), Dashboard (novo).
- [x] 8.3 Validar os cenários das specs (`access-scope-enforcement`, `user-access-control`) — cobertos por access-policy/churches/tops/org-chart/dashboard/access-control/screen-catalog + map/social-actions.

## 9. Verificação e fechamento

- [x] 9.1 `pnpm --filter api test` (Jest) verde — 363 testes / 38 suítes.
- [x] 9.2 `pnpm --filter web test` (Vitest) verde — 99 testes / 28 arquivos.
- [x] 9.3 `pnpm -r lint` (tsc shared/api/web + eslint api) e `pnpm --filter api build` verdes. (`web build` não roda no Windows por EPERM/symlink — não é erro de código; tsc/lint são a verdade de "compila".)
- [x] 9.4 Smoke local executado contra a API real (build de dist, DB dev com 242 legendários/75 igrejas): **23/23 PASS**. (a) COM escopo → Legendários 5 / Igrejas 1 / Cidades 2; tops/families/activeTeams/plannedSocialActions = null (omitidos, sem permissão de tela → sem vazamento); church IN 200 / OUT 404 / legendário OUT 404. (b) SEM escopo → Legendários/Igrejas/Cidades = 0 (fail-closed), scopeMissing=true, church antes-no-escopo → 404. Escalonamento: membro→/access-control 403, membro→password-reset 403, admin→200. UI badge "Sem escopo" é a mesma flag scopeMissing verificada.
- [x] 9.5 Cenários WHEN/THEN das specs validados via testes automatizados. NÃO alterar produção sem aval do Davi (REGRA CRÍTICA de git) — nenhum git-write feito.
