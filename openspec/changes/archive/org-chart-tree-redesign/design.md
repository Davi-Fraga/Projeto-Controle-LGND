## Context

O organograma vive em `/dashboard/organograma` (seção central com os escopos Equipes, Coordenadores, Cidades, TOPs), todos usando o renderizador compartilhado `apps/web/src/features/org-chart/org-chart-tree.tsx`. Hoje o layout é calculado por **d3-hierarchy** (vertical, top-down) em `layout.ts`, e os nós são um único componente `OrgChartNodeCard`. O backend monta uma **árvore aninhada** `OrgChartNode { id, kind, label, subtitle?, leaderId?, count, children[] }` (contrato em `packages/shared`); o front a converte para nodes/edges do React Flow.

Dois problemas: (1) o layout aparenta "uma fileira" porque as árvores de equipe/família vão direto de grupo → membros (sem nível de líder) e há equipes sem coordenador; (2) falta o visual de organograma (cartões por tipo, cor por ramo, contador, minimapa) e o enquadramento.

## Goals / Non-Goals

**Goals:**
- Layout em árvore mind-map com **dagre**, `rankdir: 'LR'`, no padrão do exemplo oficial "Dagre Tree" do React Flow.
- **Nível de líder explícito** nas visões de equipe e família (coordenador/representante segura os membros; vice é líder irmão sem membros).
- Nós com design por tipo (raiz pílula / líder cartão colorido com badge / membro cartão escuro) e arestas suaves coloridas por ramo.
- `fitView` ao carregar, **minimapa**, e expandir/recolher pelo clique no líder — mantendo zoom/pan/controles.
- Manter o renderizador compartilhado para os 4 escopos e **não** mudar o contrato `OrgChartNode`.

**Non-Goals:**
- Não muda auth, RBAC nem config global.
- Não muda o *tipo* do contrato (segue árvore aninhada `OrgChartNode`).
- Não adiciona edição/arrastar; segue read-only.
- Não recria a rota dentro do TOP (segue na seção central).

## Decisions

### 1. dagre LR substitui d3-hierarchy no layout
`layout.ts` passa a: achatar a árvore `OrgChartNode` (respeitando o set de nós recolhidos) em `nodes`/`edges`, rodar **dagre** (`new dagre.graphlib.Graph()`, `setGraph({ rankdir: 'LR', nodesep, ranksep })`, `setNode(id, { width, height })`, `setEdge(parent, child)`, `dagre.layout(g)`), e mapear `g.node(id)` → `position {x, y}` (ajustando do centro dagre para o canto que o React Flow espera). Handles dos nós custom: `target` em `Position.Left`, `source` em `Position.Right`. *Por quê:* é o padrão do exemplo oficial e entrega LR com poucos parâmetros. *Alternativas:* manter d3-hierarchy trocando eixos (LR) — funciona, mas o usuário pediu dagre explicitamente; elkjs — mais pesado/assíncrono. Remove-se a dependência `d3-hierarchy` (não mais usada). Nova dep: `dagre` + `@types/dagre`.

### 2. Cor por ramo e herança permanecem; computadas na conversão
A cor determinística por `leaderId` (paleta fixa, neutro quando ausente) e a herança na subárvore continuam — calculadas ao achatar a árvore (cada nó recebe a cor do `leaderId` próprio ou do ancestral mais próximo). As arestas recebem a cor do nó-filho (ramo).

### 3. Nível de líder explícito é montado no BACKEND (reshape da árvore)
O nível de líder muda a forma da árvore, então é feito nos builders do service (o front só renderiza o que vier):
- **Equipes por TOP** (`TopsService.buildTeamsChart`): `team (group, leaderId=coordenador)` → `coordenador (leader)` segurando os `TopServant`; `vice/deputyCoordinator (leader)` como irmão sem filhos. Sem coordenador → servos direto sob o grupo da equipe.
- **Famílias por TOP** (`TopsService.buildFamiliesChart`): `family (group, leaderId=representante)` → `representante (leader)` segurando os membros; `vice-representante (leader)` irmão. Sem representante → membros direto sob o grupo.
- **Equipes global** (`OrgChartService.getTeamChart`): `team (group)` → `coordenador (leader)` segurando os `TeamMembership` ativos; `vice (leader)` irmão. Sem coordenador → membros direto sob o grupo.
- **Coordenadores** e **Cidades**: estrutura inalterada (Coordenadores já é diretor → coordenadores-líderes; Cidades não tem líder). Só herdam o novo layout/visual.

`annotateCounts` (util compartilhado) recalcula `count` = descendentes-pessoa, então o badge do líder mostra o nº de membros sob ele automaticamente. Ids estáveis dos novos nós: `leader:<coordinatorLegendaryId>` / `deputy:<deputyLegendaryId>` (ou `:none` quando ausente), mantendo unicidade na árvore.

### 4. Nós custom por `kind`
`org-chart-node.tsx` passa a renderizar por tipo:
- `root` → pílula colorida.
- `leader` → cartão colorido (cor do ramo) + badge com `count`.
- `person` → cartão escuro arredondado com `label` + `subtitle`.
- `group`/`city` (Cidades e grupos "Sem ...") → cartão neutro de ramo (com badge `count`).
Cada nó tem handles Left/Right. O clique no nó (quando tem filhos) dispara o toggle de recolher; o chevron continua disponível.

### 5. Tree wrapper: minimapa, fitView, click-to-collapse
`org-chart-tree.tsx` adiciona `<MiniMap />` (do `@xyflow/react`) junto de `<Controls />` e `<Background />`, mantém o `fitView` ao montar e após mudança de layout, e passa um `onToggle` que o nó-líder chama no clique. O set de nós recolhidos continua em estado local; ao recolher, dagre recalcula e a viewport reenquadra.

## Risks / Trade-offs

- **Reshape da árvore pode quebrar testes de estrutura/contagem** existentes (TOP teams/families, global teams). **Mitigação:** atualizar os testes de service para o novo formato (grupo → líder → membros) e checar `count` no líder.
- **Membros não têm vínculo com líder específico** → decisão: coordenador segura todos os membros; vice é líder irmão sem membros. **Mitigação:** documentado no spec; fiel ao dado, sem inventar vínculo.
- **Nova dependência `dagre`** (peso/manutenção) e remoção de `d3-hierarchy`. **Mitigação:** dagre é leve e é o padrão do exemplo oficial; o contrato de backend não muda, então a lib de layout é trocável.
- **Árvore grande** (cidade com muitos legendários) → muitos nós. **Mitigação:** recolher por padrão além do 2º nível (comportamento atual) + badge de contagem; o clique no líder recolhe ramos.
- **Instalação de dep pode bater no erro de certificado TLS** do ambiente. **Mitigação:** repetir o `pnpm add` (já resolveu antes).

## Open Questions

- O **vice sem membros** deve aparecer sempre que existir, ou só quando a equipe/família tiver coordenador/representante? Proposto: aparece sempre que houver vice cadastrado.
- O clique no líder recolhe o ramo; manter **também** o chevron como affordance explícita? Proposto: manter ambos.
