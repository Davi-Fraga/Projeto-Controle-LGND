## 1. Investigação (obrigatória, antes de corrigir)

- [x] 1.1 Reproduzir o bug com os reais e registrar o comportamento observado — busca "joao" retorna 227/227 ativos (não filtra)
- [x] 1.2 Conferir se o termo digitado é enviado à API — sim, `search` enviado com debounce 500ms (page.tsx + api.ts)
- [x] 1.3 Conferir se o backend recebe o parâmetro e o aplica no `where` do Prisma — sim, em `where.OR` (linha 58-65)
- [x] 1.4 Confirmar se a busca é sobre o banco inteiro ou apenas sobre a página carregada — banco inteiro (`where` antes de skip/take)
- [x] 1.5 Testar caixa e acentos (`joao` → `João`) — caixa OK (ILIKE); acento NÃO (joao→0, joão→12)
- [x] 1.6 Causa raiz registrada: `normalizePhone(search)` vira `''` em termos textuais → `phone contains ''` casa todos. Estratégia de acento: aguardando decisão

## 2. Correção no backend

- [x] 2.1 Garantir que o DTO/query da listagem aceite o termo de busca — `search` já existia no `LegendarioQueryDto`
- [x] 2.2 Aplicar o termo no `where` do Prisma antes de paginação e ordenação, sobre o conjunto completo — `buildSearchOr` no `where.OR`, antes de skip/take
- [x] 2.3 Estratégia aprovada: coluna normalizada `searchText` (sem acento/caixa) + migration `20260628120000_add_legendary_search_text` com backfill; bug do `phone contains ''` corrigido (findAll + options)
- [x] 2.4 Busca coexiste com paginação, ordenação e demais filtros (status/city/scope) — `OR` somado às outras chaves do `where` + `AND` de escopo

## 3. Correção no frontend

- [x] 3.1 Enviar o termo à API na requisição de listagem (sem filtro local) — já enviava `search`
- [x] 3.2 Debounce no campo — já existia (`useDebounce`, 500ms)
- [x] 3.3 Prevenir race: descartar respostas obsoletas — adicionado `requestIdRef` (só a requisição mais recente aplica resultado)
- [x] 3.4 Refletir estados de loading, resultado e vazio — já existiam

## 4. Testes

- [x] 4.1 Backend: termo no `where` (searchText normalizado) sem clause de phone vazio; busca numérica por dígitos; searchText no create
- [x] 4.2 Backend: coexistência com escopo/`AND` coberta pelos testes de scope existentes; OR somado às demais chaves
- [ ] 4.3 Frontend: teste automatizado de race ainda não escrito (guarda implementada e verificada manualmente) — pendente

## 5. Verificação

- [x] 5.1 Rodar testes focados (Legendários) — 13/13 ✓ (3 novos)
- [x] 5.2 `pnpm -r lint` ✓; `pnpm -r test` ✓ (api 111, web 11); build: api ✓, **web `next build` falha em EPERM symlink do standalone (ambiental Windows, sem relação com a mudança)**
- [x] 5.3 Conferência via DB com os 227 reais: busca "joao" antes retornava 227 (todos), agora filtra para 12 (Joãos, sem acento); todos os 227 com `searchText` após backfill
