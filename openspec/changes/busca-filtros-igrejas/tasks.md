> Decisões aprovadas: **A** endpoint aditivo (`GET /churches` global intacto) · **B1** escopo por cidade ∪ churchIds (novo `buildChurchScopeWhere`) · **C** busca inclui aliases · **D** filtros {cidade, com/sem coordenadas, com/sem legendários}, **cidade como select** de cidades distintas.

## 1. Dados (migration nova)

- [ ] 1.1 Adicionar `Church.searchText String?` + `@@index([searchText])` no `schema.prisma`.
- [ ] 1.2 Gerar migration nova (`pnpm db:migrate:dev`) — nunca alterar migration aplicada.
- [ ] 1.3 Backfill do `searchText` das ~75 igrejas existentes (nome + cidade, normalizado com a função já usada no módulo) na própria migration ou script idempotente.

## 2. Backend — busca/filtro/escopo/paginação

- [ ] 2.1 `ChurchQueryDto` estendendo `PaginationDto` (search?, city?, hasCoordinates?, hasLegendarios?, orderBy/orderDirection) espelhando `LegendarioQueryDto`.
- [ ] 2.2 Recomputar `Church.searchText` em `ChurchesService.create/update` reusando a normalização existente (não duplicar).
- [ ] 2.3 `buildChurchScopeWhere(scope)` no `AccessPolicyService` (**B1**: `city ∈ legendaryCities` OU `id ∈ churchIds`; admin → `{}`) + teste espelhando `buildLegendaryWhere`.
- [ ] 2.4 Método de busca no `ChurchesService`: monta `where` com `buildSearchOr` (só clauses não-vazias: `searchText` + `aliases.some.normalizedAlias`), filtros (cidade, coordenadas, vínculo), escopo via `buildChurchScopeWhere`, `getPagination` + `toPaginatedResponse`.
- [ ] 2.5 Endpoint de cidades distintas (para o select) dentro do escopo, ou derivar no front a partir da resposta — decidir no menor custo.
- [ ] 2.6 Novo handler no `ChurchesController` (rota estática antes de `:id`), `@Permissions('churches.read')`; `GET /churches` global inalterado.
- [ ] 2.7 Testes de serviço (espelham `legendarios.service.spec.ts`): busca por nome, busca por alias, sem-acento/caixa, `contains: ''` não ocorre, filtros, escopo restrito não vaza, busca+filtro+paginação juntos.

## 3. Frontend — tela de Igrejas

- [ ] 3.1 Nova função de listagem paginada em `features/churches/api.ts` (mantém `getChurches` global para dropdowns).
- [ ] 3.2 Painel de busca/filtros + paginação em `dashboard/igrejas/page.tsx` reusando o padrão de Legendários: input + `useDebounce(500)` + guard anti-race `requestIdRef`; select/input de cidade; toggles com/sem coordenadas e com/sem legendários.
- [ ] 3.3 Estados carregando/vazio/resultado e reset de página ao mudar busca/filtro.

## 4. Verificação

- [ ] 4.1 `pnpm -r lint && pnpm -r test && pnpm -r build`.
- [ ] 4.2 Percorrer os critérios de aceite da spec `church-search`, um a um (incluindo teste HTTP de escopo por role: restrito não encontra igreja fora do escopo).
- [ ] 4.3 Confirmar que dropdowns que usam `GET /churches` (form de Legendário, filtro de Legendários, access-control) seguem funcionando.
