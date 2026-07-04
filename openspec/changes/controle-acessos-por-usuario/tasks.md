## 1. Inspeção e plano

- [x] 1.1 Inspecionar `common/access` (`AccessPolicyService`), `PermissionsGuard`, `RolesGuard`, modelos RBAC no Prisma e o seed
- [x] 1.2 Mapear telas → tipos de escopo aplicáveis (cidade/equipe/igreja)
- [x] 1.3 Apresentar diffs/modelo de dados e aguardar aprovação antes de aplicar

## 2. Modelo de dados

- [x] 2.1 Migration: override de permission por usuário (GRANT/REVOKE) e escopo por usuário (1-N, tipo + valor)
- [x] 2.2 Atualizar seed idempotente se novas permissions forem necessárias (nenhuma permission nova necessária; seed mantido idempotente)

## 3. Backend — permissions efetivas e escopo

- [x] 3.1 Calcular permissions efetivas (papel + concessões − revogações)
- [x] 3.2 `PermissionsGuard` usa as efetivas, reavaliadas por requisição (revogação reflete sem relogar)
- [x] 3.3 `AccessPolicyService` aplica o conjunto de escopos (cidade/equipe/igreja) em consultas e mutações
- [x] 3.4 Validar combinação permission×escopo; recusar inválidas
- [x] 3.5 Endpoints da tela de Controle de Acessos (ler/alterar overrides e escopos de um usuário)

## 4. Frontend — Controle de Acessos

- [x] 4.1 Tela por usuário: lista permissions com origem (herdada/concedida/revogada) e toggle
- [x] 4.2 Gestão de escopos (adicionar/remover, múltiplos)
- [x] 4.3 Adaptar menus/navegação às permissions efetivas (sem ser barreira de segurança)

## 5. Testes (regra crítica)

- [x] 5.1 Permissions efetivas seguem a fórmula; concessão e revogação individuais
- [x] 5.2 403 logo após revogação em sessão ativa (sem relogar)
- [x] 5.3 IDOR por URL direta e acesso fora do escopo por cidade negados
- [x] 5.4 Usuário com múltiplos escopos vê os seus e não um terceiro
- [x] 5.5 Revalidar login/acessos dos perfis existentes (sem regressão) — suíte completa (139) sem regressão

## 6. Verificação

- [x] 6.1 Testes focados (access/guard/policy) — 135 testes, 17 suites verdes
- [x] 6.2 `pnpm -r lint` ✓, `pnpm --filter api test` ✓ (135), Prisma client regenerado, `api build` ✓. `web build`: type-check/lint ✓, mas `next build` (output standalone) falha só ao criar symlinks no Windows (EPERM) — limitação de ambiente (precisa Modo Desenvolvedor/admin), não do código.
- [ ] 6.3 Conferência manual (Gestor de Piracanjuba só vê Piracanjuba; revogação reflete sem relogar) — coberto por testes automatizados; conferência manual no app rodando ainda pendente

## 7. Reformulação: controle por TELA + ESCOPO (substitui UI por permission)

- [x] 7.1 `screen-catalog.ts`: mapa canônico Tela→{view, edit} + `scopeTypes` (12 telas)
- [x] 7.2 Migration: `UserScopeType` += `TOP` (`20260629140000_user_scope_type_add_top`)
- [x] 7.3 `AccessControlService`: endpoints por tela (GET estado tela+nível+escopos; PUT nível por tela; POST/DELETE escopo) traduzindo p/ overrides/escopos por baixo
- [x] 7.4 `AccessPolicyService`: + escopo TOP e asserts equipe/igreja/TOP; `TopScopeGuard` (IDOR em todas as rotas :id de tops) + filtro em tops.findAll; org-chart team aplica assert. teams/churches já filtravam via resolveScope (TEAM/CHURCH mesclados). NOTA: lista de igrejas mantida GLOBAL (decisão existente do projeto) — escopo CHURCH age nos dados vinculados, não no diretório.
- [x] 7.5 Frontend: ~80 toggles → lista de TELAS com nível (NONE/VER/VER+EDITAR) + escopo com `AsyncCombobox` (mesmo padrão do "legendário vinculado")
- [x] 7.6 `packages/shared`: `ScreenAccessLevel`, `ScreenAccessEntry`, `UserScreenAccessControl`, `UserScopeType += TOP`
- [x] 7.7 Testes: acesso/nível por tela (VIEW/EDIT/NONE), validação tela×escopo (incl. TOP), IDOR de TOP (guard) e de equipe (org-chart), múltiplos escopos (cidade/TOP) — 142 testes verdes
- [x] 7.8 Verificação: `pnpm -r lint` ✓, API build ✓, API tests ✓ (142), Prisma client regenerado (dev parado). `web build` standalone segue com EPERM de symlink (ambiente). Conferência manual (Coordenador da Segurança só vê a Segurança) ainda pendente no app rodando.

## 8. Correção dos seletores de escopo (consistência + validação real)

- [x] 8.1 Frontend: seletor único reutilizável (`AsyncCombobox`) para os 4 tipos — busca a lista REAL do backend, filtro tolerante a acento/caixa (`stripAccents`), subtítulo (igreja/TOP → cidade), múltiplos (chips). Input de texto livre de cidade REMOVIDO.
- [x] 8.2 Backend: `normalizeScopeValue` agora valida que a CIDADE existe entre os Legendários (`cityExists`); rejeita inexistente. Equipe/Igreja/TOP já validavam referência.
- [x] 8.3 Backend: opções reais reusadas (`/teams/options`, `/tops/options`, `/churches`, `/org-chart/cities/options`); tolerância a acento feita no filtro client-side (listas pequenas ≤33).
- [x] 8.4 Limpeza de dados: `CITY="londres"` removido do banco (script guardado). Validação nova impede recriação.
- [x] 8.5 Testes: rejeita cidade inexistente (unit + live 400) e aceita real (live 201); validação TOP/equipe/igreja; IDOR já coberto. 143 testes verdes.
- [x] 8.6 Verificação: `pnpm -r lint` ✓, API tests ✓ (143), smoke live (validação cidade + página 200). Conferência manual visual dos dropdowns pendente no app.

## 9. Função na Manada (papéis desacoplados do acesso)

- [x] 9.1 `common/access/access.constants.ts`: `ADMIN_ROLE = 'COORDINATION_ADMIN'` + `roleContributesBase`/`hasAdminRole` (fonte única).
- [x] 9.2 Efetivas: base do papel só conta para admin — `EffectivePermissionsService`, `auth.service.toSafeUser`, `users.service.toSafeUser`, `AccessControlService.roleKeys`.
- [x] 9.3 `AccessPolicyService.isAdmin` = só `COORDINATION_ADMIN` (Coordenação-usuário vira função comum). Escopo por função (líder/coordenador) mantido.
- [x] 9.4 Migração: acesso atual (via papel) de cada usuário NÃO-admin convertido em GRANTs explícitos (idempotente; admins pulados). 1 usuário migrado (+13 GRANTs); ninguém perdeu acesso.
- [x] 9.5 Front `user-form.tsx`: "Perfis de Acesso" → "Função na Manada" + texto de que não define acesso.
- [x] 9.6 Testes: função não-admin não concede; admin total; efetivas não-admin = concessões − revogações. 146 testes verdes.
- [x] 9.7 Verificação: `pnpm -r lint` ✓, API tests ✓ (146), smoke live (admin=86 total; não-admin=concessões; boot OK).

## 10. Correção de vazamentos de escopo + criar/excluir admin

### Grupo 1 — escopo por dimensão da tela (composição)
- [ ] 10.1 `AccessPolicyService.buildLegendaryWhere`: virar filtro GEOGRÁFICO (cidade ∪ igreja ∪ legendaryIds) — remover o branch de equipe. Legendários/Relatórios/Mapa deixam de vazar membros de equipe de outras cidades. (Equipe segue em `buildTeamWhere` para Equipes/Organograma; TOP em `buildTopWhere`.)
- [ ] 10.2 Reports: aplicar escopo em `byProfession`/`byExpertise` (hoje contam tudo). Revisar todos os endpoints de reports.
- [ ] 10.3 Revisar módulos sem escopo por dimensão: dashboard, social-actions, communications — aplicar o filtro geográfico onde listam dados de legendários/cidade.

### Grupo 2 — criar/excluir = admin
- [ ] 10.4 `screen-catalog`: remover `*.create`/`*.delete`/`*.restore`/`*.deactivate` de ENTIDADE DE TOPO dos conjuntos `edit` (viram admin-only). Manter update e sub-recursos (members.add/remove, participants.add, etc.).
- [ ] 10.5 Limpeza de dados: remover overrides GRANT de create/delete que porventura existam para não-admin.
- [ ] 10.6 Front: esconder botões "Novo TOP"/"Nova Equipe"/etc. para quem não tem a permission de criar (só usabilidade; backend já barra).

### Grupo 3 — seletores do organograma escopados
- [ ] 10.7 Organograma: os seletores de equipe/TOP listam só o que está no escopo do usuário (cidades já vêm escopadas). Endpoints/seleção respeitam o escopo.

### Testes e verificação
- [x] 10.8 Testes: filtro geográfico (cidade∪igreja, sem equipe); catálogo não concede create/delete de topo; access-control EDIT sem create/delete. 149 testes verdes. Smoke live: city+team → 133, 0 fora de Caldas; POST tops/teams → 403; org-chart teams/options só ['ADM'].
- [x] 10.9 `pnpm -r lint` ✓ (api/web/shared), API tests ✓ (149), smoke live ✓. Usuários de teste removidos.

> NOTA (follow-up separado): o **Dashboard** (`/dashboard` summary) conta legendários/equipes/TOPs/cidades de forma GLOBAL, sem escopo — vaza agregados para não-admin. Não estava na lista explícita (superfície grande); tratar numa próxima iteração se desejado.
