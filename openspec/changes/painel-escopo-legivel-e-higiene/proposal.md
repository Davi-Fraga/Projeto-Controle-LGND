# Painel de escopo legível + higiene do controle de acesso

## Why

Uma auditoria completa do controle de acesso (27/07/2026, sobre a `main` #35) foi disparada
por um incidente em produção: um MEMBRO com a dimensão Igreja em **"Todos"** via
`0 igrejas encontradas`, enquanto a aba Líderes Espirituais — mesmo usuário, mesmo escopo —
listava normalmente. A causa (`buildChurchScopeWhere` ignorava o modo `ALL`) já foi corrigida
à parte, com a invariante declaração×enforcement travada por teste.

O que a auditoria revelou **por trás** do incidente é o problema desta change: **o admin não
tem como conferir visualmente o escopo que ele mesmo configurou.** Os chips de escopo do
painel mostram **UUID cru** (`3f2a1b9c-…`) para Equipe/Igreja/TOP, porque o backend nunca
preenche o campo `label` que o contrato já prevê. Foi exatamente isso que fez o estado real
do usuário — "Todos", e não uma lista de igrejas — passar despercebido até virar chamado.
Sem essa correção, o próximo desalinhamento de escopo será descoberto do mesmo jeito: por
um usuário reclamando que a tela está vazia.

Junto vêm três armadilhas de operação e dois resíduos que a mesma varredura encontrou.

## What Changes

**Legibilidade do painel (o item que motiva a change)**
- Os valores de escopo passam a trafegar com `label` humano: nome da igreja (com cidade
  como subtítulo), nome da equipe, `TOP #n — nome`, nome da cidade. O contrato
  `ScopeValueEntry.label` já existe e é opcional — passa a ser sempre preenchido.
- O painel deixa de renderizar UUID em qualquer situação.

**Escopo é global por tipo — a UI passa a dizer isso**
- Hoje `UserScope`/`UserScopePolicy` têm chave `(userId, type)`: o escopo de Igreja é **um
  só** para todas as telas de igreja. O painel desenha o editor dentro do card de cada tela,
  sugerindo o contrário — mexer em "Igreja" no card de Líderes Espirituais muda também o de
  Igrejas, silenciosamente.
- O painel passa a declarar o alcance da edição e a listar quais telas concedidas são
  afetadas por aquela dimensão.

**Modo configurado × modo efetivo**
- Os botões `Nenhum / Selecionados / Todos` acendem hoje por `effectiveMode`. Para um
  `SPIRITUAL_LEADER` (igrejas derivadas do papel), acende "Selecionados" com lista vazia e
  o botão "Aplicar" nasce desabilitado — estado sem saída óbvia.
- Passam a refletir `configuredMode` (o que o admin controla), com os valores derivados do
  papel exibidos à parte como read-only.

**Vazamento de agregado no Mapa**
- `map.service.ts` conta `_count.legendarios` por igreja **sem** aplicar o filtro de escopo:
  um usuário escopado vê o total real da igreja, não o da sua fatia. Passa a ser escopado.

**Higiene**
- Remoção de `isCityRestricted` / `isTeamRestricted` / `isChurchRestricted` /
  `isTopRestricted` — sem nenhum consumidor de produção, só testes. Mantê-los convida a
  reintroduzir a semântica de escopo que o hardening removeu.
- Limpeza das permissions órfãs no seed: `families.create/read/update` (tela removida),
  `social-actions.restore`, `audit.read`, `organogram.read`. Nenhuma tem endpoint nem tela.

Sem **BREAKING**: nenhuma mudança amplia ou reduz o acesso de qualquer usuário. A única
alteração de dados visíveis é a contagem do Mapa, que hoje está errada para quem é escopado.

## Capabilities

### New Capabilities
Nenhuma. A change corrige e detalha comportamento já coberto por spec existente.

### Modified Capabilities
- `user-access-control`: os requisitos de **apresentação do escopo** na tela administrativa
  passam a exigir rótulo humano (nunca identificador técnico), a explicitar que o escopo é
  **global por dimensão** (não por tela) e a distinguir **configurado** de **efetivo**. O
  requisito de escopo por dimensão ganha cenário cobrindo **contagens agregadas** do Mapa.

## Impact

**Backend**
- `apps/api/src/modules/access-control/access-control.service.ts` — `buildScopeBaseState`
  passa a resolver labels; novo lookup por dimensão, restrito aos ids em escopo.
- `apps/api/src/common/access/access-policy.service.ts` — remoção dos quatro `is*Restricted`.
- `apps/api/src/modules/map/map.service.ts` — `_count.legendarios` escopado.
- `prisma/seed.ts` — remoção das permissions órfãs (idempotente, com tratamento dos
  `UserPermissionOverride` que porventura as referenciem).

**Shared**
- `packages/shared/src/index.ts` — `ScopeValueEntry.label` deixa de ser opcional na prática
  (contrato documentado); possível campo de alcance da dimensão para a UI.

**Frontend**
- `apps/web/src/features/access-control/access-control-panel.tsx` — chips com label, aviso
  de alcance global da dimensão, botões por `configuredMode`.

**Testes**
- `access-control.service.spec.ts`, `access-policy.service.spec.ts`,
  `access-control-panel.test.tsx`, novo teste do agregado do Mapa.

**Fora de escopo (deliberado)**
- Unificar `buildChurchWhere` e `buildChurchScopeWhere` numa semântica única de igreja.
  Decisão registrada no incidente: removeria acesso de quem hoje vê igrejas por cidade,
  e exige levantamento prévio de usuários afetados. Change própria.
- Tornar o escopo configurável **por tela** (mudança de modelo de dados).
