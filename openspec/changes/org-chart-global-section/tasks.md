## 1. Refactor: helpers de montagem compartilhados

- [x] 1.1 Extrair `orgNode`, `annotateCounts` e a normalização de cidade de `TopsService` para um util reutilizável (ex.: `apps/api/src/common/org-chart/org-chart.util.ts`)
- [x] 1.2 Apontar `TopsService.getOrgChart` para o util extraído e confirmar que os testes existentes de TOP (service/contrato/guarda) seguem verdes

## 2. Backend — módulo org-chart (visões globais)

- [x] 2.1 Criar `apps/api/src/modules/org-chart` (module + controller fino + service) no padrão `social-actions`, registrado no `AppModule`
- [x] 2.2 Criar DTOs: `CitiesQueryDto` validando `mode` ∈ {legendaries, churches}
- [x] 2.3 `GET /org-chart/teams/:teamId` (`JwtAuthGuard` + `PermissionsGuard` + `@Permissions('teams.read')`) → árvore Team → sub-coordenador + membros ativos (`TeamMembership` ACTIVE), `leaderId` = coordenador; 404 se equipe inexistente
- [x] 2.4 `GET /org-chart/coordinators` (`@Permissions('teams.read')`) → raiz "Direção" (diretor, ver Open Questions) → coordenador por equipe ativa com coordenador (subtitle = equipe); omitir equipe sem coordenador
- [x] 2.5 `GET /org-chart/cities` (`@Permissions('legendarios.read')`) modo `legendaries`: cidade normalizada → legendário; grupo "Sem cidade"
- [x] 2.6 `GET /org-chart/cities` modo `churches`: cidade → igreja (via `Legendary.church`) → legendário; grupos "Sem igreja" e "Sem cidade"
- [x] 2.7 Garantir `count` (descendentes-pessoa), `leaderId` e ids estáveis/únicos em todas as visões globais (reusando o util)

## 3. Frontend — seção dedicada e seletor de escopo

- [x] 3.1 Criar fetchers globais em `apps/web/src/features/org-chart/api.ts` (`getTeamOrgChart`, `getCoordinatorsOrgChart`, `getCitiesOrgChart(mode)`) via `@/lib/api`
- [x] 3.2 Criar a rota `apps/web/src/app/dashboard/organograma/page.tsx` com seletor de escopo (Equipes / Coordenadores / Cidades / TOPs)
- [x] 3.3 Escopo Equipes: seletor de equipe (reusar `getTeamsOptionsList`) → renderizar a árvore da equipe no `OrgChartTree`
- [x] 3.4 Escopo Coordenadores: carregar e renderizar a cadeia diretor → coordenadores
- [x] 3.5 Escopo Cidades: toggle de modo (legendário / igreja → legendário) → renderizar
- [x] 3.6 Escopo TOPs: seletor de TOP (reusar `getTopOptions`) reaproveitando o componente de visão de TOP existente (3 visões)
- [x] 3.7 Adicionar o item "Organograma" no menu lateral, com gating por permissão (`teams.read` ∨ `legendarios.read` ∨ `tops.read`)
- [x] 3.8 Estados de carregando / vazio / erro por escopo, reusando o renderizador genérico

## 4. Remoção do acesso dentro do TOP

- [x] 4.1 Remover o botão "Organograma" de `apps/web/src/app/dashboard/tops/[id]/page.tsx`
- [x] 4.2 Remover a rota `apps/web/src/app/dashboard/tops/[id]/organograma/page.tsx` e referências órfãs

## 5. Testes e verificação

- [x] 5.1 Teste de service (org-chart global): equipe (com/sem coordenador), coordenadores (equipe sem coordenador omitida) e cidades nos 2 modos (grupos "Sem cidade"/"Sem igreja", agrupamento por grafia equivalente) com `count` agregado correto
- [x] 5.2 Teste de contrato: as visões globais retornam o mesmo shape `OrgChartNode`
- [x] 5.3 Teste de guarda: `teams.read` para equipes/coordenadores, `legendarios.read` para cidades; `mode` inválido → 400
- [x] 5.4 Conferir `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` passam
- [ ] 5.5 Conferência visual: item no menu abre a seção; os 4 escopos renderizam (zoom/pan/recolher, cor por líder, contador); o detalhe do TOP não tem mais botão "Organograma"

## 6. Refinamento — Cidades uma por vez (feedback)

- [x] 6.1 Backend: `GET /org-chart/cities/options` (lista de cidades normalizadas + "Sem cidade" com contagem) e `GET /org-chart/cities?mode=&city=` retornando só a cidade escolhida (raiz = cidade; sentinela `__none__` para "Sem cidade")
- [x] 6.2 Frontend: seletor de cidade no escopo Cidades (uma por vez), com placeholder até selecionar; mantém o toggle de modo (legendário / igreja)
- [x] 6.3 Atualizar testes de service (options + cidade única nos 2 modos + "Sem cidade") e ajustar o teste de contrato
