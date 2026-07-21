> Escopo: **frontend-only**. Backend (`churchId` no DTO/service + escopo) já suporta — nada a mudar. Sem migration. Reusa o filtro `churchId` existente (decisões D1–D4 no design).

## 1. Botão "Ver legendários" (aba Líderes Espirituais)

- [x] 1.1 Em `apps/web/src/app/dashboard/lideres-espirituais/page.tsx`, trocar o `href` fixo `/dashboard/legendarios` por `/dashboard/legendarios?churchId=<church.id>&churchName=<encodeURIComponent(church.name)>` usando o `church` já disponível no `map` (`church.id`, `church.name`).

## 2. Tela de Legendários — hidratar filtro pela URL

- [x] 2.1 Em `apps/web/src/app/dashboard/legendarios/page.tsx`, ler `churchId` (e `churchName`) via `useSearchParams` e inicializar `filters.churchId` com esse valor na montagem (sob a Suspense boundary já usada em páginas client do projeto — D2/riscos).
- [x] 2.2 Manter o efeito de listagem atual inalterado: ele já envia `filters.churchId` ao backend; garantir que a **primeira** requisição já sai com o `churchId` da URL (nada de filtrar só a página carregada).
- [x] 2.3 Ao alterar o `<select>` de igreja ou limpar o filtro, refletir na URL com `router.replace` (mantém URL ↔ UI coerentes; sem reload) — reusar `updateFilter('churchId', …)`.

## 3. Indicação visual do filtro ativo + limpar

- [x] 3.1 Exibir um indicador (chip/rótulo) da igreja filtrada quando houver `churchId` ativo, usando `churchName` da URL como rótulo; fallback neutro ("Igreja selecionada") se ausente — não depende do catálogo global (`getChurches`) ter carregado (D3, caso usuário restrito).
- [x] 3.2 Ação de limpar o filtro de igreja: zera `filters.churchId`, remove `churchId`/`churchName` da URL e volta a listar por "todas as igrejas".

## 4. Verificação

- [x] 4.1 `pnpm -r lint && pnpm -r build` (front compila com `useSearchParams` sob Suspense; sem erro de App Router). Evidência: lint passou nos 3 pacotes e o Next compilou; o build global parou depois no type-check de alteração concorrente em `org-chart-tree.tsx` (`canStructureChange` ausente nas props de `PersonPanel`).
- [x] 4.2 Percorrer os critérios de aceite da spec `legendarios-church-deeplink`, um a um: (a) clique abre lista filtrada; (b) igrejas diferentes → filtros diferentes; (c) URL sem `churchId` mantém comportamento atual; (d) indicador visível + limpar volta a todas; (e) rótulo aparece para usuário restrito.
- [x] 4.3 Escopo — teste de que `churchId` fora do escopo **não vaza**: com usuário restrito, abrir a lista com um `churchId` fora do escopo retorna vazio/escopado (backend `buildLegendaryWhere`); confirmar via chamada HTTP à API de Legendários, não só pela UI. Evidência HTTP: igreja autorizada retornou 1; igreja fora do escopo tinha 1 no banco e retornou 0 para a conta temporária, removida ao final.
- [x] 4.4 Confirmar que o `<select>` de igreja e os demais filtros de Legendários seguem funcionando quando abertos sem deep-link.
