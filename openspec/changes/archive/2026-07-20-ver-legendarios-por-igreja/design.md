## Context

O filtro por igreja **já existe end-to-end** no domínio de Legendários: `LegendarioQueryDto.churchId` (`@IsUUID`), o service aplica `churchId` no `where` e combina com o escopo de acesso (`AccessPolicyService.buildLegendaryWhere`), e a tela de Legendários tem um `<select>` de igreja preso a `filters.churchId`. O que falta é **ligação de navegação**: o botão "Ver legendários" do card de igreja não passa a igreja, e a tela de Legendários não lê filtros da URL.

Portanto, esta é uma correção **frontend-only**, de baixo risco, que reusa infraestrutura já testada. O `design.md` existe aqui menos por complexidade arquitetural e mais para registrar duas decisões que têm alternativas reais (fonte da verdade do filtro; como rotular a igreja para usuário restrito) e a conexão com a change `busca-filtros-igrejas`.

## Goals / Non-Goals

**Goals:**

- Clicar em "Ver legendários" abrir a lista já filtrada pela igreja do card (`churchId`).
- A tela de Legendários hidratar o filtro de igreja a partir da URL, reusando o mesmo `churchId` da API e o mesmo estado de filtro do `<select>` — sem caminho paralelo.
- Deixar claro qual igreja está filtrando e permitir limpar.
- Preservar o escopo de acesso (backend continua barrando; verificar por teste que não vaza).

**Non-Goals:**

- Nenhuma mudança de backend (DTO/service/escopo já suportam `churchId`).
- Nenhuma migration.
- Não implementar a busca/filtros da tela de **Igrejas** (change `busca-filtros-igrejas`, independente).
- Não transformar todos os filtros de Legendários em estado de URL — o escopo é só o `churchId` do deep-link (os demais filtros podem seguir só em estado local); manter mínimo.

## Decisions

### D1 — URL query param (`?churchId=`) como veículo do deep-link

**Escolha:** o botão navega para `/dashboard/legendarios?churchId=<church.id>`; a página lê com `useSearchParams`.
**Por quê:** é um link compartilhável/bookmarkável, sobrevive a refresh, é o padrão do Next App Router e não exige estado global. Router `state`/context perderia o filtro no reload e seria um segundo mecanismo.
**Alternativa descartada:** passar via `Link` state ou store — mais acoplado, não compartilhável, e some no F5.

### D2 — URL sincroniza o `filters.churchId` existente (não um filtro novo)

**Escolha:** na montagem, inicializar `filters.churchId` a partir do `searchParams`; o efeito de carregamento atual (que já manda `filters.churchId` ao backend) continua igual. Ao trocar o `<select>` ou limpar, atualizar a URL (`router.replace`) para manter URL e UI coerentes — sem recarregar a página.
**Por quê:** reusa exatamente o filtro `churchId` que a API e o `<select>` já usam. Zero lógica de filtragem nova; satisfaz a restrição "não duplicar".
**Alternativa descartada:** ler `searchParams` e disparar uma query separada só para o deep-link — criaria um segundo caminho de listagem e risco de divergência.

### D3 — Rótulo da igreja resiliente para usuário restrito

**Problema:** o `<select>` é populado por `getChurches()` (catálogo global); para papéis restritos essa chamada pode falhar e cair em `[]`, deixando o `<select>` sem o nome da igreja filtrada.
**Escolha:** transmitir também o **nome da igreja** no deep-link (ex.: `?churchId=<id>&churchName=<nome>`), usado apenas como rótulo do indicador visual. O `churchId` continua sendo a única coisa que filtra de fato (backend valida escopo). O nome é só apresentação; se ausente, cai num rótulo neutro ("Igreja selecionada").
**Por quê:** o card de igreja já tem `church.name` à mão; barato e evita depender do catálogo global. Não introduz risco de segurança porque o nome não altera a query nem o escopo.
**Alternativa considerada:** buscar o nome por um `GET /churches/:id` ao hidratar — mais uma requisição e mais superfície; desnecessário quando o nome já veio do card. Fica como fallback opcional se algum dia o deep-link vier sem nome.

### D4 — Change separada de `busca-filtros-igrejas`

**Escolha:** entregar como change própria, pequena, frontend-only, sem depender da change de busca de igrejas.
**Por quê:** `busca-filtros-igrejas` cria um endpoint novo de **igrejas**; esta liga um botão ao filtro `churchId` de **legendários** que já existe. Não há contrato compartilhado nem dependência. Acoplá-las atrasaria uma correção simples. A restrição de "reusar o mesmo mecanismo de filtro" é sobre o filtro de **Legendários** (já existente) — e é isso que fazemos.

## Risks / Trade-offs

- **[URL e UI divergirem]** (usuário troca o `<select>` mas a URL fica no `churchId` antigo) → ao mudar/limpar o filtro, refletir na URL com `router.replace`; a URL é derivada do estado do filtro de igreja.
- **[`churchName` na URL ser cosmético e manipulável]** → é só rótulo; o filtro real é o `churchId`, e o escopo é reavaliado no backend. Um `churchName` forjado não expõe nada; no pior caso mostra um rótulo errado com lista vazia/escopada.
- **[`useSearchParams` exige Suspense boundary no App Router]** → garantir que a página cliente esteja sob a fronteira adequada (padrão já usado no projeto para páginas client), evitando erro de build.
- **[Regressão no comportamento sem deep-link]** → sem `churchId` na URL, o fluxo é idêntico ao atual; coberto por cenário de aceite "URL sem churchId mantém comportamento atual".

## Migration Plan

Não há migração de dados. Deploy é só frontend. Rollback = reverter o commit do front (backend intacto o tempo todo).

## Open Questions

- Nenhuma bloqueante. Ponto menor de UX a confirmar na implementação: se o indicador do filtro por igreja deve ser um **chip removível** dedicado ou apenas o próprio `<select>` já vindo selecionado + rótulo. Decisão de menor custo, alinhável no PR.
