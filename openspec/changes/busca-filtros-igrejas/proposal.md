## Why

A listagem de Igrejas (`GET /churches`, tela `dashboard/igrejas`) carrega **todas** as igrejas de uma vez, sem busca, filtro nem paginação. Com ~75 igrejas e crescendo, o admin rola uma lista grande para achar uma igreja. As telas de Legendários já resolveram isso (busca no backend por `searchText` normalizado, filtros, paginação, debounce + anti-race) — a de Igrejas deve seguir o **mesmo padrão já corrigido**, sem inventar outro.

Nota de investigação (pedida): o "bug conhecido" da busca de Legendários **já foi corrigido** na change arquivada `corrigir-busca-legendarios`. O estado atual é o padrão bom a copiar; esta change carrega explicitamente as 3 salvaguardas daquela correção (sem `contains: ''`, busca no backend antes de paginar, anti-race no front) para **não** reintroduzir o defeito.

## What Changes

- **Novo endpoint de listagem de igrejas paginado, buscável e escopado** — sem quebrar o `GET /churches` atual, que continua sendo a **referência global** dos dropdowns de cadastro (form de Legendário, filtros, painel de acesso). A tela de Igrejas passa a consumir o novo endpoint.
- **Busca por texto no nome da igreja** com a **mesma normalização do sistema** (sem acento, case-insensitive), via nova coluna `searchText` em `Church` (espelha o padrão de `Legendary.searchText`). "PIB" acha "Primeira Igreja Batista (PIB)".
- **Busca inclui aliases** (recomendado): "Primeira Batista" encontra a igreja pelo `ChurchAlias.normalizedAlias` já existente — reusa a tabela de aliases sem denormalizar.
- **Filtros** (conjunto recomendado): por **cidade**; **com/sem coordenadas** (achar igrejas que faltam geocoding); **com/sem legendários vinculados** (achar igrejas vazias, candidatas a limpeza/fusão).
- **Escopo de acesso aplicado no novo endpoint** (`AccessPolicyService`) — usuário restrito não vê/busca igrejas fora do escopo. **Semântica do escopo é decisão aberta** (ver design): por cidade (∪ churchIds) vs. só churchIds.
- **Paginação** no padrão existente (`PaginationDto` + `toPaginatedResponse`).
- **Front** da tela de Igrejas ganha painel de busca/filtros reusando o mesmo padrão da tela de Legendários (input + `useDebounce` + guard anti-race `requestIdRef`), sem componente novo.

## Capabilities

### New Capabilities
- `church-search`: listagem de igrejas com busca textual (nome + aliases, sem acento/caixa), filtros (cidade, com/sem coordenadas, com/sem legendários), paginação e **escopo de acesso**, exposta por um endpoint dedicado — distinta da rota de referência global usada por dropdowns.

### Modified Capabilities
<!-- Nenhuma capability de spec existente muda seu contrato. O GET /churches global permanece intacto. -->

## Impact

- **Backend**
  - `apps/api/src/modules/churches/churches.controller.ts` — novo handler de listagem paginada/buscável/escopada (rota dedicada; `GET /churches` inalterado).
  - `apps/api/src/modules/churches/churches.service.ts` — método de busca (where + `searchText`/aliases + escopo + paginação); manter `normalizeName`/normalização já existente (não duplicar).
  - Novo `ChurchQueryDto` (estende `PaginationDto`) espelhando `LegendarioQueryDto`.
  - `Church.searchText` recomputado em `create/update` (reuso da normalização já usada no módulo).
- **Banco (Prisma)**
  - Migration **nova**: coluna `searchText String?` + índice em `Church`; backfill do `searchText` das ~75 igrejas existentes (a partir de nome + cidade). Nenhuma migration aplicada é alterada.
- **Frontend**
  - `apps/web/src/app/dashboard/igrejas/page.tsx` — painel de busca/filtros + paginação (padrão da tela de Legendários).
  - `apps/web/src/features/churches/api.ts` — nova função de listagem paginada (o `getChurches` global permanece para dropdowns).
- **Fora de escopo**: mapa/geocoding (change `mapa-distribuicao-intra-cidade`, separada); alterar o comportamento global de `GET /churches`; corrigir a busca de Legendários (já corrigida) — apenas não replicar o defeito.
