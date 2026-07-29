## Context

Estado atual (verificado):

- **Igrejas (front):** `dashboard/igrejas/page.tsx` chama `getChurches()` → `GET /churches`, que retorna **todas** as igrejas (`ChurchesService.findAll`, sem where de busca, sem escopo, sem paginação). Sem campo de busca/filtro/paginação na tela.
- **`GET /churches` é referência global por design** (memória `access-policy-scope-intent`, decidida em 2026-06-06): usado como dropdown em `legendario-form.tsx`, no filtro de igreja da tela de Legendários, no `access-control-panel` e na edição de igreja. Escopar essa rota **quebraria** os dropdowns de roles não-admin.
- **Padrão de busca já correto em Legendários:** `LegendariosService.findAll` aplica busca no `where` do Prisma sobre `Legendary.searchText` (normalizado: sem acento, minúsculo), **antes de paginar**, via `buildSearchOr` que só inclui clauses não-vazias (evita `contains: ''`), com escopo via `AccessPolicyService.buildLegendaryWhere`, paginação via `getPagination`/`toPaginatedResponse`. Front com `useDebounce(500)` + guard anti-race `requestIdRef`. `searchText` é populado em create/update **e** no forms-sync.
- **Igrejas têm aliases:** `ChurchAlias.normalizedAlias @unique` (já normalizado por curadoria/backfill).
- **Escopo de igreja:** `buildChurchWhere(scope)` filtra por `scope.churchIds` (igrejas lideradas); não há hoje escopo de igreja por cidade.

## Goals / Non-Goals

**Goals:**
- Busca + filtros + paginação na listagem de Igrejas, no backend, respeitando escopo.
- Reusar o padrão corrigido de Legendários (normalização, `searchText`, anti-race, paginação) — sem duplicar nem reintroduzir o bug antigo.
- Não quebrar o `GET /churches` global (dropdowns).

**Non-Goals:**
- Mapa/geocoding (change separada).
- Redesenhar a tela de Igrejas além de busca/filtros/paginação.
- Alterar auth/RBAC/seed além de aplicar o escopo já existente.
- "Corrigir" a busca de Legendários (já corrigida) — apenas não replicar o defeito.

## Decisions

### Decisão A: endpoint aditivo, não quebrar o `GET /churches` global (recomendada)

`GET /churches` permanece **exatamente** como está (lista global, sem paginação) — é a fonte dos dropdowns. Adiciona-se um **endpoint dedicado** de listagem paginada/buscável/escopada para a tela de Igrejas (ex.: `GET /churches/search` ou `GET /churches/list`), no padrão de `GET /legendarios`. A tela de Igrejas passa a consumi-lo.

- **Alternativa rejeitada (B):** tornar `GET /churches` paginado+escopado e migrar todos os dropdowns para um novo `/churches/options`. Mais consistente a longo prazo, porém quebra vários consumidores não-admin e muda o shape da resposta — risco alto para pouco ganho agora. Fica registrado como evolução futura possível.

> **Ponto de decisão 1:** confirmar A (aditivo, recomendado) ou optar por B (refatorar a rota global).

### Decisão B: semântica do escopo de igreja (precisa da sua decisão)

O requisito diz "usuário restrito a uma cidade não deve ver igrejas fora do escopo". Hoje `buildChurchWhere` escopa por **churchIds** (igrejas que a pessoa lidera), não por cidade. Duas semânticas possíveis:

| Opção | Regra | Efeito p/ SPIRITUAL_LEADER |
|---|---|---|
| **B1 — por cidade ∪ churchIds (recomendada)** | `city ∈ scope.legendaryCities` **OU** `id ∈ scope.churchIds` | vê todas as igrejas da(s) sua(s) cidade(s) + as que lidera |
| B2 — só churchIds (reusa `buildChurchWhere`) | `id ∈ scope.churchIds` | vê só as igrejas que lidera |

B1 casa melhor com a frase "restrito a uma cidade" e com o `buildLegendaryWhere` (que já usa cidade ∪ igreja). Exige um novo helper `buildChurchScopeWhere(scope)` (cidade ∪ churchIds) — **não** reusa `buildChurchWhere` (que é churchIds puro, usado por outras telas). Admin/COORDINATION_USER seguem irrestritos (`isAdmin`).

> **Ponto de decisão 2:** B1 (por cidade, recomendada) ou B2 (só igrejas lideradas)?

### Decisão C: busca inclui aliases (recomendada: sim)

Adiciona-se `Church.searchText` (normalizado: nome + cidade), espelhando `Legendary.searchText` — recomputado em create/update reusando a normalização já existente no módulo. A busca monta um `OR` (só clauses não-vazias, como em Legendários):

```
OR: [
  { searchText: { contains: term } },                              // nome + cidade
  { aliases: { some: { normalizedAlias: { contains: term } } } },  // aliases já normalizados
]
```

`ChurchAlias.normalizedAlias` já está normalizado com a mesma receita (NFD, sem diacrítico, minúsculo, espaços colapsados) que `searchText`, então **um único termo normalizado** casa nos dois lados. Aliases entram via relação (não denormalizados em `searchText`) para não precisar recomputar `searchText` quando um alias é curado.

- **Alternativa rejeitada:** só `name` com `mode: 'insensitive'` — resolve caixa mas **não** acento, e não acha por alias. Fica aquém do resto do sistema.

> **Ponto de decisão 3:** confirmar inclusão de aliases na busca (recomendado).

### Decisão D: conjunto de filtros recomendado

- **Cidade** (obrigatório): filtro por cidade. Recomendo um **select das cidades distintas** de igrejas (poucas, dado de referência) para evitar erro de acento do `contains` livre; free-text é a alternativa mais barata.
- **Com/sem coordenadas** (`hasCoordinates` boolean): `latitude`/`longitude` não-nulos vs. nulos — acha igrejas que faltam geocoding.
- **Com/sem legendários vinculados** (`hasLegendarios` boolean): `legendarios: { some: { deletedAt: null } }` vs. `none` — acha igrejas vazias (candidatas a limpeza/fusão).

Ordenação padrão: `name asc` (igual ao `findAll` atual). Todos combináveis com busca + paginação (como em Legendários).

> **Ponto de decisão 4:** confirmar o conjunto {cidade, com/sem coordenadas, com/sem legendários}.

### Decisão E: replicar o padrão corrigido, com as 3 salvaguardas

Do achado da investigação (o bug de Legendários já está corrigido), carregar explicitamente:
1. **`buildSearchOr` só adiciona clause não-vazia** — nunca `contains: ''` (que casaria todos).
2. **Busca no `where` do backend, antes de paginar** — nunca filtrar localmente a página carregada.
3. **Front:** `useDebounce` + guard anti-race (`requestIdRef`) — resposta obsoleta não sobrescreve.

Testes de regressão espelham os de Legendários (`legendarios.service.spec.ts`).

## Risks / Trade-offs

- **[Quebrar dropdowns ao escopar a rota global]** → **Mitigação:** Decisão A mantém `GET /churches` intacto; o escopo vive só no endpoint novo.
- **[`searchText` desatualizado]** se create/update não recomputar. → **Mitigação:** recomputo no serviço + backfill das ~75 na migration + teste que verifica o valor normalizado (como em Legendários).
- **[Divergência de normalização entre `searchText` e `normalizedAlias`]** quebraria a busca por alias. → **Mitigação:** usar a MESMA função de normalização já existente no módulo para ambos; teste que busca por alias e por nome com o mesmo termo.
- **[Vazamento de escopo]** um restrito ver igreja fora do escopo. → **Mitigação:** escopo no `where` do backend + teste HTTP por role (restrito não recebe fora do escopo), espelhando o padrão de Legendários.
- **[Filtro de cidade sensível a acento]** se free-text `contains`. → **Mitigação:** select de cidades distintas (Decisão D) evita o problema.

## Migration Plan

1. Migration nova: `Church.searchText String?` + índice; backfill do `searchText` das igrejas existentes (nome + cidade normalizados). Nenhuma migration aplicada é alterada.
2. Backend: `ChurchQueryDto`, método de busca no serviço (where + escopo + paginação), novo handler no controller; recomputo de `searchText` em create/update.
3. Front: painel de busca/filtros + paginação na tela de Igrejas; nova função de API paginada.
4. `pnpm -r lint && test && build` + verificação dos critérios de aceite.

**Rollback:** endpoint novo é aditivo (remover não afeta a rota global); coluna `searchText` é recomputável; front atrás do dado.

## Open Questions (resolvidas)

1. **Decisão A: ✅ endpoint aditivo.** `GET /churches` global permanece intacto; novo endpoint dedicado paginado+escopado+buscável para a tela de Igrejas.
2. **Decisão B: ✅ B1 — escopo por cidade ∪ churchIds.** Novo helper `buildChurchScopeWhere(scope)` = `city ∈ legendaryCities` OU `id ∈ churchIds`; admin/COORDINATION_USER irrestritos.
3. **Decisão C: ✅ incluir aliases na busca.** `OR` sobre `searchText` + `aliases.some.normalizedAlias`.
4. **Decisão D: ✅ filtros {cidade, com/sem coordenadas, com/sem legendários}; cidade como select** de cidades distintas (fonte: cidades distintas de igrejas do escopo).
