## Why

O organograma foi entregue (change `org-chart-visualization`) acessível **somente dentro de um TOP** (`/dashboard/tops/[id]/organograma`). Isso esconde a feature e a amarra a um TOP, quando a manada também precisa enxergar a estrutura **global**: as equipes do cadastro (Teams), a cadeia de coordenação (diretor → coordenadores) e a distribuição por cidade — independente de qualquer TOP. A correção é promover o organograma a uma **seção própria no menu lateral**, com as visões globais e a de TOP reunidas num só lugar.

## What Changes

- Adiciona um item **"Organograma"** no menu lateral, abrindo uma rota dedicada `/dashboard/organograma` (não mais dentro do TOP).
- A nova área oferece um seletor de **escopo** com quatro visões, todas renderizadas pelo mesmo componente de árvore (`OrgChartTree`) sobre o contrato `OrgChartNode` já existente:
  - **Equipes** — seletor de equipe: uma `Team` por vez (coordenador → sub-coordenador → membros ativos de `TeamMembership`).
  - **Coordenadores** — diretor no topo → coordenador de cada equipe (cadeia de coordenação global).
  - **Cidades** — alterna entre `cidade → legendário` e `cidade → igreja → legendário` (global, sobre `Legendary`/`Church`).
  - **TOPs** — seletor de TOP que reaproveita as três visões já existentes do TOP (Equipes / Chefes de Família / Cidades).
- **BREAKING (navegação)**: remove o botão "Organograma" da tela de detalhe do TOP e a rota `/dashboard/tops/[id]/organograma`; o organograma de um TOP passa a ser acessado pela aba central, escopo **TOPs**.
- Backend: novos endpoints de leitura para as visões globais (equipes, coordenadores, cidades), reusando o contrato `OrgChartNode`; o endpoint `GET /tops/:id/org-chart` continua servindo o escopo TOPs.

## Capabilities

### New Capabilities
- `org-chart-global`: seção dedicada de organograma no menu lateral, com as visões globais (Equipes por seleção, Coordenadores, Cidades em dois modos) e o reaproveitamento da visão de TOP, todas read-only com zoom/pan/recolher, cor por líder e contador por nó.

### Modified Capabilities
<!-- A capability org-chart-visualization (introduzida no change homônimo, ainda não arquivada) tem sua LOCALIZAÇÃO/ACESSO alterada: deixa de ser acessível dentro do TOP. Como ainda não há spec canônica em openspec/specs/, a relocação é descrita como requisito da nova capability org-chart-global; o contrato OrgChartNode e o renderizador são reaproveitados sem alteração de comportamento. -->

## Impact

- **Affected specs**: nova capability `org-chart-global`.
- **Affected code**:
  - API: novo módulo `apps/api/src/modules/org-chart` (controller fino + service + DTOs) no padrão `social-actions`, com endpoints globais (`/org-chart/teams/:teamId`, `/org-chart/coordinators`, `/org-chart/cities?mode=`), protegidos pelas permissões de leitura já existentes (`teams.read`, `legendarios.read`). Sem migration.
  - Web: nova rota `apps/web/src/app/dashboard/organograma/page.tsx` + novo item no menu lateral; ampliação de `apps/web/src/features/org-chart` (seletor de escopo, fetchers globais), **reaproveitando** `OrgChartTree`/contrato. Remoção da rota `tops/[id]/organograma` e do botão no detalhe do TOP.
  - Shared: reuso de `OrgChartNode`/`OrgChartView`; possível adição de tipos de escopo/parâmetros globais em `packages/shared`.
- **Affected data**: nenhuma. Operação 100% de leitura sobre `Team`, `TeamMembership`, `Legendary`, `Church`, `TopEvent` e modelos do TOP.
- **Risco**: baixo. Não altera schema, escrita nem autorização; reusa contrato e renderizador. O único ponto sensível é a definição da fonte do "diretor" na visão Coordenadores (ver Open Questions do design).
