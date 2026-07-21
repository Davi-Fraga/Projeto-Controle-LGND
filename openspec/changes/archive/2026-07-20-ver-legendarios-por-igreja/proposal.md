## Why

Na aba **Líderes Espirituais** (`dashboard/lideres-espirituais`), cada card de igreja tem o botão **"Ver legendários"**. O esperado é abrir a lista de Legendários **filtrada por aquela igreja**; hoje o botão é um link fixo para `/dashboard/legendarios` **sem nenhum parâmetro de igreja**, então a lista abre mostrando **todos** os legendários, sem filtro.

Diagnóstico (investigação pedida, sem alterar código):

1. **O botão é um link sem filtro.** [`lideres-espirituais/page.tsx:112`](apps/web/src/app/dashboard/lideres-espirituais/page.tsx#L112) usa `<Link href="/dashboard/legendarios">` — não passa `churchId` (query nem state), embora o `church.id` esteja disponível no `map`. **Esta é a causa-raiz.**
2. **A tela de Legendários não hidrata filtros pela URL.** [`legendarios/page.tsx`](apps/web/src/app/dashboard/legendarios/page.tsx) já suporta o filtro `churchId`, mas só a partir do estado local `filters.churchId` (não lê `searchParams`). Ou seja, mesmo que o botão passasse `?churchId=…`, a página **ignoraria**. Segundo gap a corrigir.
3. **O backend já suporta e já é seguro.** [`LegendarioQueryDto.churchId`](apps/api/src/modules/legendarios/dto/legendario-query.dto.ts#L21) (`@IsUUID`) existe; o service aplica `churchId: query.churchId` no `where` ([`legendarios.service.ts:48`](apps/api/src/modules/legendarios/legendarios.service.ts#L48)) **e** aplica o escopo via `AccessPolicyService.buildLegendaryWhere` ([linhas 61‑64](apps/api/src/modules/legendarios/legendarios.service.ts#L61)). **Nenhuma mudança de backend é necessária** e o escopo já barra vazamento fora do acesso do usuário.

Conclusão: correção é **puramente de frontend** — ligar o botão ao filtro `churchId` **já existente** (via URL) e fazer a tela de Legendários hidratar esse filtro a partir da URL. Não é filtro ignorado por bug de backend, nem falta de suporte: é **link sem parâmetro + página que não lê a URL**.

## What Changes

- **Botão "Ver legendários" passa a carregar a igreja**: navega para `/dashboard/legendarios?churchId=<church.id>` (o `church.id` já está no card). Reusa o filtro `churchId` existente — **não** cria caminho paralelo.
- **A tela de Legendários hidrata o filtro `churchId` a partir da URL** (`useSearchParams`): ao abrir com `?churchId=…`, o filtro já entra aplicado; sem o param, comportamento atual inalterado. O mesmo mecanismo de listagem (backend `churchId` + escopo + paginação + anti-race) é reusado.
- **Indicação visual do filtro ativo por igreja**: a tela mostra claramente que está filtrando por uma igreja e permite limpar o filtro (voltar a "todas"). Para usuário restrito — cujo `getChurches()` global pode vir vazio — o rótulo da igreja é resolvido sem depender do dropdown estar populado (nome da igreja acompanha o deep-link).
- **Escopo preservado**: o endpoint de Legendários continua aplicando `buildLegendaryWhere`; se o `churchId` estiver fora do escopo do usuário, a lista volta vazia (sem vazar). Coberto por teste.

Relação com a change **`busca-filtros-igrejas`** (avaliação pedida): são **independentes**. Aquela cria um endpoint novo de busca de **igrejas**; esta apenas liga um botão ao filtro `churchId` de **legendários** que **já existe** (backend + estado do front). Não há dependência nem sobreposição de contrato — recomenda-se **change própria, pequena e frontend-only**, sem esperar a de igrejas.

## Capabilities

### New Capabilities
- `legendarios-church-deeplink`: navegação da igreja para a lista de Legendários já filtrada por aquela igreja (`churchId`), com o filtro hidratado a partir da URL, indicação visual do filtro ativo, opção de limpar, e respeito ao escopo de acesso (não vaza legendários fora do escopo do usuário).

### Modified Capabilities
<!-- Nenhuma. O contrato de `legendarios-search` (busca/paginação/anti-race) permanece intacto; o filtro churchId já existente é reusado, não redefinido. -->

## Impact

- **Frontend (apenas)**
  - [`apps/web/src/app/dashboard/lideres-espirituais/page.tsx`](apps/web/src/app/dashboard/lideres-espirituais/page.tsx) — botão "Ver legendários" passa a incluir `?churchId=<church.id>` (e o nome da igreja como rótulo do deep-link).
  - [`apps/web/src/app/dashboard/legendarios/page.tsx`](apps/web/src/app/dashboard/legendarios/page.tsx) — inicializa/sincroniza `filters.churchId` a partir de `useSearchParams`; exibe chip/indicador da igreja ativa com ação de limpar. Mantém o padrão existente (debounce + guard anti-race).
- **Backend**: nenhuma alteração (DTO, service e escopo já suportam `churchId`).
- **Banco / Prisma**: nenhuma migration.
- **Fora de escopo**: a busca/filtros da tela de Igrejas (`busca-filtros-igrejas`); qualquer mudança no contrato do endpoint de Legendários; alterar o `GET /churches` global.
