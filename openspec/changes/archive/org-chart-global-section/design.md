## Context

O change `org-chart-visualization` já entregou: o contrato compartilhado `OrgChartNode`/`OrgChartView` em `packages/shared`, o renderizador genérico `OrgChartTree` (React Flow + d3-hierarchy, com zoom/pan/recolher, cor por líder e contador), e o endpoint `GET /tops/:id/org-chart` no módulo `tops`. Os helpers de montagem (`orgNode`, `annotateCounts`, normalização de cidade) hoje vivem **privados** dentro de `TopsService`.

Esta mudança reaproveita tudo isso e adiciona **organogramas globais** (não atrelados a um TOP), promovendo o organograma a uma seção própria no menu lateral. Os dados globais vêm de `Team`/`TeamMembership` (equipes e coordenação) e de `Legendary`/`Church` (cidades). O renderizador e o contrato **não mudam**.

## Goals / Non-Goals

**Goals:**
- Promover o organograma a uma seção dedicada (`/dashboard/organograma`) com item no menu lateral, fora do TOP.
- Quatro escopos sobre o mesmo renderizador: Equipes (uma por vez), Coordenadores (diretor → coordenadores), Cidades (dois modos), TOPs (reuso).
- Montar as árvores globais no **backend**, reusando o contrato `OrgChartNode` e os helpers de montagem.
- Reaproveitar `OrgChartTree` e o componente de visão de TOP existente — zero duplicação de renderizador/contrato.

**Non-Goals:**
- Não alterar schema, migrations nem regras de autorização.
- Não criar edição/CRUD a partir do organograma (segue read-only).
- Não exportar imagem/PDF.
- Não recalcular hierarquia no front — front continua burro/renderizador.

## Decisions

### 1. Novo módulo de API `org-chart` (visões globais) + reuso do endpoint de TOP
Criar `apps/api/src/modules/org-chart` (controller fino + service + DTOs) no padrão `social-actions`. Endpoints:
- `GET /org-chart/teams/:teamId` — `@Permissions('teams.read')` — árvore de uma equipe (coordenador → sub-coordenador → membros ativos).
- `GET /org-chart/coordinators` — `@Permissions('teams.read')` — diretor → coordenador de cada equipe.
- `GET /org-chart/cities?mode=legendaries|churches` — `@Permissions('legendarios.read')` — cidades globais nos dois modos.

O escopo **TOPs** continua usando `GET /tops/:id/org-chart` (já existe). *Por quê:* as visões globais cruzam Team/Legendary/Church, fora do domínio `tops`; um módulo dedicado mantém o controller fino e o service com a regra. *Alternativa rejeitada:* empilhar tudo no módulo `tops` — vazaria responsabilidade de equipes/cidades para dentro de TOP.

### 2. Extrair os helpers de montagem para um util compartilhado (refactor)
Mover `orgNode`, `annotateCounts` e a normalização de cidade de `TopsService` para um util reutilizável (ex.: `apps/api/src/common/org-chart/org-chart.util.ts`), e fazer **tanto** `TopsService` **quanto** o novo `OrgChartService` consumirem o mesmo util. *Por quê:* evita um segundo jeito de montar nó/contar/normalizar (regra do projeto). *Alternativa rejeitada:* duplicar os helpers no novo módulo — divergiria com o tempo.

### 3. Mapeamento das visões globais
- **teams (uma equipe)**: raiz = `Team` (label = nome, `leaderId` = coordenador, subtitle "Equipe"). Filhos: sub-coordenador (se houver, como pessoa/líder) e um nó-pessoa por `TeamMembership` ativo (status ACTIVE, não deletado). Equipe sem coordenador → sem `leaderId` (neutro).
- **coordinators**: raiz = "Direção" (o diretor; ver Open Questions) → um nó por equipe ativa **com** coordenador, `kind: 'leader'`, label = nome do coordenador, subtitle = nome da equipe, `leaderId` = id do coordenador. Equipes sem coordenador são omitidas.
- **cities (mode=legendaries)**: raiz "Cidades" → nó `city` por cidade normalizada de `Legendary.city` (legendários ativos) → nó-pessoa por legendário; "Sem cidade" para os sem cidade.
- **cities (mode=churches)**: raiz "Cidades" → nó `city` → nó de igreja (`kind: 'group'`, via `Legendary.church`) → nó-pessoa por legendário; "Sem igreja" para legendários sem `churchId`; "Sem cidade" para os sem cidade.

`count` (descendentes-pessoa) e cor por `leaderId` seguem a mesma mecânica do contrato existente; nós de cidade/igreja não têm `leaderId` (cor neutra). Ids estáveis: `team:<id>`, `coordinator:<teamId>`, `city:<slug>`, `church:<id>`, `legendary:<id>`, `member:<teamMembershipId>`.

### 4. Front: seção única com seletor de escopo, reusando o renderizador
Nova rota `apps/web/src/app/dashboard/organograma/page.tsx` + item "Organograma" no menu lateral. Um seletor de **escopo** (Equipes / Coordenadores / Cidades / TOPs); Equipes e TOPs ganham um seletor secundário (equipe/TOP, reusando `getTeamsOptionsList`/`getTopOptions`), Cidades ganha um toggle de modo. Todos os escopos alimentam o **mesmo** `OrgChartTree`. O escopo TOPs reaproveita o componente de visão de TOP já existente (`features/org-chart`), passando o `topId` escolhido. Novos fetchers entram em `features/org-chart/api.ts`. *Por quê:* um só renderizador e um só ponto de navegação.

### 5. Remoção do acesso dentro do TOP
Remover o botão "Organograma" de `apps/web/src/app/dashboard/tops/[id]/page.tsx` e a rota `apps/web/src/app/dashboard/tops/[id]/organograma/page.tsx`. O organograma de um TOP passa a ser alcançado pelo escopo **TOPs** da seção central. *Por quê:* corrige o equívoco de acesso e evita dois caminhos para a mesma tela.

### 6. Visibilidade do item no menu
O item "Organograma" SHALL aparecer para quem tem qualquer uma das permissões de leitura usadas (`teams.read`, `legendarios.read` ou `tops.read`), seguindo o mesmo mecanismo de gating já usado pelos outros itens do menu. Dentro da seção, escopos individuais podem ser ocultados/negados conforme a permissão específica.

## Risks / Trade-offs

- **Árvore global muito grande** (todos os legendários por cidade) → centenas de nós. **Mitigação:** o renderizador já recolhe subárvores além do 2º nível por padrão; contador no nó dá noção de tamanho sem expandir. Virtualização/paginação fica como follow-up.
- **Fonte do "diretor" indefinida no schema** → a visão Coordenadores precisa de um topo. **Mitigação:** decisão default + Open Question (abaixo); enquanto não definido, raiz neutra "Direção" sem `leaderId`.
- **Cidade/igreja não normalizadas** → grafias divergentes viram grupos distintos. **Mitigação:** reusar a normalização de cidade já existente; igreja agrupada por `churchId` (estável).
- **Dependência do change anterior** → esta mudança assume `OrgChartNode` + `OrgChartTree` + endpoint de TOP já presentes. **Mitigação:** aplicar **depois** de `org-chart-visualization` (ver Migration Plan).
- **Refactor dos helpers** (extrair de `TopsService`) → risco de regressão na visão de TOP. **Mitigação:** os testes de service/contrato já existentes do TOP devem continuar verdes após a extração.

## Migration Plan

1. Aplicar primeiro o change `org-chart-visualization` (contrato, renderizador, endpoint de TOP) — já implementado.
2. Aplicar este change: extrair helpers → criar módulo `org-chart` (API) → criar seção web + item de menu → remover rota/botão do TOP.
3. Rollback: como é aditivo e read-only, reverter = remover o módulo/rota novos e restaurar o botão/rota do TOP; sem migration para desfazer.

## Open Questions

- **Fonte do "diretor"** na visão Coordenadores: (a) coordenador de uma equipe específica (ex.: equipe cujo nome casa com "Coordenação"/"Direção"), (b) um legendário configurável, ou (c) raiz neutra "Direção" sem pessoa? Proposto: (c) como default, com (a) se houver uma equipe de coordenação clara.
- Na visão **Equipes**, "membros" considera apenas `TeamMembership` ativo (proposto) ou também coordenador/sub como pessoas separadas? Proposto: coordenador/sub como nós próprios + membros ativos.
- O escopo **Cidades (legendaries)** cobre **todos** os legendários ativos (proposto) ou um subconjunto (ex.: só Rota do Cerrado)?
