## Why

O organograma renderiza com d3-hierarchy num layout vertical e raso: como as árvores hoje vão direto de grupo → membros (sem um nível explícito de líder) e várias equipes estão sem coordenador, a tela parece "uma fileira de nós" em vez de uma árvore. Falta também o visual de organograma de verdade (cartões, cor por ramo, contador no líder) e enquadramento/minimapa. Precisamos de um layout em árvore mind-map (raiz à esquerda, ramos à direita) e um nível de líder explícito para a estrutura ficar legível.

## What Changes

- **Layout LR com dagre**: troca o cálculo de posições de d3-hierarchy por **dagre** (`rankdir: 'LR'`, `nodesep`/`ranksep` com respiro), no padrão do exemplo oficial "Dagre Tree" do React Flow. Handles dos nós passam a Left (target) / Right (source).
- **Nível de líder explícito** (muda a FORMA da árvore, montada no backend — o *tipo* do contrato `OrgChartNode` não muda):
  - Visão Equipes (global e por TOP): `grupo (equipe)` → `coordenador (líder, segura os membros)` + `vice (líder irmão, sem membros)` → `membros`.
  - Visão Famílias (por TOP): `grupo (família)` → `representante (líder)` + `vice-representante (líder irmão)` → `membros`.
  - Quando não há coordenador/representante, os membros ficam sob o nó do grupo (sem líder), tornando o buraco visível.
- **Redesign dos nós (custom nodes)**: RAIZ = pílula colorida; LÍDER = cartão colorido (cor por ramo) com badge/"bolinha" do número de membros abaixo; MEMBRO = cartão escuro arredondado com nome + subtítulo (equipe/função). Cores por ramo/líder com paleta consistente; arestas `smoothstep` na cor do ramo.
- **Interações**: `fitView` ao carregar para enquadrar a árvore inteira; **minimapa** (novo) além de zoom/pan/controles já existentes; **expandir/recolher** um ramo ao **clicar no nó-líder** (além do chevron já existente).
- Mantém o renderizador **compartilhado** (`OrgChartTree`) servindo os 4 escopos (Equipes, Coordenadores, Cidades, TOPs).

## Capabilities

### New Capabilities
- `org-chart-tree-redesign`: layout em árvore mind-map (dagre LR) e design de nós/arestas do organograma compartilhado, com nível de líder explícito, cor por ramo, contador no líder, minimapa, fitView e expandir/recolher ao clicar no líder.

### Modified Capabilities
<!-- Refina o comportamento de renderização/estrutura introduzido pelos changes org-chart-visualization e org-chart-global (ainda não arquivados em openspec/specs/). Como não há spec canônica para modificar, os novos requisitos ficam nesta capability; o contrato OrgChartNode é mantido. -->

## Impact

- **Affected code**:
  - Web: `apps/web/src/features/org-chart/` — `layout.ts` (d3-hierarchy → dagre LR), `org-chart-node.tsx` (3 variantes de cartão + handles L/R + clique recolhe), `org-chart-tree.tsx` (minimapa, fitView, click-to-collapse). Nova dependência **`dagre`** (+ `@types/dagre`); remoção de `d3-hierarchy` (não mais usado).
  - API: `apps/api/src/modules/tops/tops.service.ts` (builders teams/families ganham nível de líder) e `apps/api/src/modules/org-chart/org-chart.service.ts` (getTeamChart ganha nível de líder). Sem mudança de contrato, sem migration.
- **Affected data**: nenhuma. 100% leitura.
- **Não muda**: contrato `OrgChartNode` (segue árvore aninhada), auth, RBAC, config global.
- **Risco**: baixo/médio. É redesign de renderização + reshape de árvore (mais nós); coberto por testes de service (contagem/estrutura) e verificação visual.
