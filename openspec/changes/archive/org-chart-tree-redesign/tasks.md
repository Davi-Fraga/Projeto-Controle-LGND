## 1. Dependências de layout

- [x] 1.1 Instalar `dagre` e `@types/dagre` em `apps/web`; remover `d3-hierarchy`/`@types/d3-hierarchy` (não mais usado)

## 2. Backend — nível de líder explícito (reshape da árvore)

- [x] 2.1 `TopsService.buildTeamsChart`: `team (group)` → `coordenador (leader)` segurando os `TopServant`; `vice (leader)` irmão sem filhos; sem coordenador → servos direto sob o grupo
- [x] 2.2 `TopsService.buildFamiliesChart`: `family (group)` → `representante (leader)` segurando os membros; `vice-representante (leader)` irmão; sem representante → membros direto sob o grupo
- [x] 2.3 `OrgChartService.getTeamChart`: `team (group)` → `coordenador (leader)` segurando os `TeamMembership` ativos; `vice (leader)` irmão; sem coordenador → membros direto sob o grupo
- [x] 2.4 Ids estáveis dos novos nós (`leader:<id>` / `deputy:<id>` / `:none`) e `count` no líder via `annotateCounts`
- [x] 2.5 Atualizar testes de service afetados (TOP teams/families e global teams) para o novo formato grupo → líder → membros, conferindo `count` no líder

## 3. Frontend — layout dagre LR

- [x] 3.1 Reescrever `layout.ts`: achatar a árvore (respeitando recolhidos) em nodes/edges, rodar dagre (`rankdir: 'LR'`, `nodesep`/`ranksep`), mapear posições para o React Flow
- [x] 3.2 Manter cor por ramo/herança e cor da aresta pelo ramo durante o achatamento
- [x] 3.3 Ajustar handles dos nós para `Position.Left` (target) / `Position.Right` (source)

## 4. Frontend — design dos nós e arestas

- [x] 4.1 `org-chart-node.tsx`: variantes por `kind` — raiz (pílula), líder (cartão colorido + badge de contagem), membro (cartão escuro com nome + subtítulo), grupo/cidade (cartão neutro de ramo)
- [x] 4.2 Arestas `smoothstep` na cor do ramo
- [x] 4.3 Clique no nó-líder (com filhos) recolhe/expande; manter o chevron como affordance

## 5. Frontend — navegação

- [x] 5.1 Adicionar `<MiniMap />` ao lado de `<Controls />`/`<Background />`
- [x] 5.2 `fitView` ao carregar e reenquadrar após recolher/expandir e troca de escopo

## 6. Verificação

- [x] 6.1 `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` passam (rebuild de `shared` antes; não buildar o web com o dev no ar)
- [ ] 6.2 Conferência visual nos 4 escopos: árvore LR mind-map, 3 níveis em Equipes/Famílias, cartões por tipo, cor por ramo, badge no líder, minimapa, fitView e recolher pelo clique no líder
