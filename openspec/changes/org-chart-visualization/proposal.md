## Why

Um TOP envolve dezenas de pessoas organizadas em camadas (representantes, coordenadores, equipes, famílias, membros) que hoje só existem como listas/tabelas espalhadas na tela de detalhe do TOP. Não há forma de **enxergar a hierarquia de relance** — quem responde a quem, quantas pessoas cada líder puxa, como o TOP se distribui por cidade. Um organograma em árvore top-down (estilo mind map) torna a estrutura legível num olhar, ajuda a achar buracos (líder sem equipe, família sem chefe) e serve de apoio visual em reuniões de coordenação.

## What Changes

- Adiciona a capability `org-chart-visualization`: uma área de visualização (somente leitura) que desenha a hierarquia de um TOP como árvore top-down, com **zoom, pan e expandir/recolher** de nós.
- **Três visões**, todas filtradas por `topEventId`:
  - **Equipes**: TOP → coordenação geral → equipes (`TopTeam`) → servos/integrantes de cada equipe.
  - **Chefes de Família**: TOP → coordenação de famílias → famílias (`TopFamily`, representante = chefe) → membros (`TopFamilyMember`).
  - **Cidades**: TOP → cidades → pessoas do TOP agrupadas pela cidade do legendário.
- Endpoint de leitura no módulo `tops` que monta a árvore normalizada por visão (nós com `id`, rótulo, papel, líder e contador de descendentes), protegido por `tops.read`.
- Feature web nova que renderiza a árvore no estilo **mind map**: layout top-down, **cor por líder**, **contador na bolinha** do nó, sem edição.

## Capabilities

### New Capabilities
- `org-chart-visualization`: visualização read-only da hierarquia de um TOP em árvore top-down (zoom/pan/expandir-recolher), nas visões Equipes, Chefes de Família e Cidades, com cor por líder e contador por nó.

### Modified Capabilities
<!-- Nenhuma capability existente tem requisitos alterados. O endpoint novo reaproveita a permissão tops.read. -->

## Impact

- **Affected specs**: nova capability `org-chart-visualization`.
- **Affected code**:
  - API: `apps/api/src/modules/tops` — novo endpoint `GET /tops/:id/org-chart?view=teams|families|cities` (controller fino + método de service), reusando `JwtAuthGuard` + `PermissionsGuard` e a permissão `tops.read`. Sem nova migration.
  - Web: nova feature `apps/web/src/features/org-chart` + rota em `apps/web/src/app/dashboard/tops/[id]/organograma`. Possível **nova dependência de front** para layout/render de árvore (decisão em design.md).
  - Shared: tipos do contrato da árvore em `packages/shared`.
- **Affected data**: nenhuma. Operação 100% de leitura sobre `TopEvent`, `TopTeam`, `TopServant`, `TopFamily`, `TopFamilyMember`, `TopParticipant`, `Legendary`.
- **Risco**: baixo. Não altera schema, escrita, auth nem regras existentes; é uma camada de leitura/visualização aditiva.
