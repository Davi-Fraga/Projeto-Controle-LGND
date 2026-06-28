## 1. Inspeção

- [x] 1.1 Campo em `apps/web/src/features/users/user-form.tsx` — `<select>` que carrega todos via `getLegendarios({perPage:200})` (trunca em 200/227)
- [x] 1.2 Endpoint dedicado já existe: `GET /legendarios/options` (`OptionsQueryDto`: search, limit≤100, activeOnly) → `{id,label,value,metadata:{fullName,lgndNumber,city,church}}`
- [x] 1.3 Estratégia alinhada: `options` já usa `buildSearchOr`/`searchText` (acento-insensível) — mesma do `corrigir-busca-legendarios`, sem divergência
- [ ] 1.4 Apresentar os diffs propostos e aguardar aprovação antes de aplicar

## 2. Backend — busca leve de opções

- [x] 2.1 Endpoint `GET /legendarios/options` já expõe enxuto (id, fullName, city, lgndNumber, church) por termo — reaproveitado, sem duplicar
- [x] 2.2 Busca case/acento-insensível via `searchText` (`buildSearchOr`) + `limit` (≤100); mesma estratégia do `corrigir-busca-legendarios`
- [x] 2.3 Teste do `options`: termo filtra por `searchText` ('joão'→'joao'), respeita `limit`, payload com city/lgndNumber/church

## 3. Frontend — combobox

- [x] 3.1 `<select>` substituído pelo `AsyncCombobox` (busca no backend + debounce 300ms via `useDebounce`)
- [x] 3.2 Cada item mostra nome (label) + cidade · LGND (sublabel)
- [x] 3.3 Opção "Nenhum" como padrão/limpar
- [x] 3.4 Estados de loading e vazio; busca no backend com `limit` (não carrega todos)
- [x] 3.5 Componente reutilizável: `fetchOptions` injetável + render padrão de item (label/sublabel)

## 4. Padrão reaproveitável

- [x] 4.1 Padrão documentado no cabeçalho do `AsyncCombobox.tsx` (exemplo de uso para outros dropdowns)
- [x] 4.2 Fonte de dados injetável via prop `fetchOptions` — reusar sem reescrever o componente

## 5. Verificação

- [x] 5.1 Testes focados (Legendários): 14/14 ✓ (1 novo do `options`)
- [x] 5.2 `pnpm -r lint` ✓ (incl. tsc web/api); `pnpm -r test` ✓ (api 112, web 11); build: api ✓, web `✓ Compiled successfully` + 25/25 páginas (falha só no `EPERM symlink` do standalone, ambiental Windows)
- [x] 5.3 Conferência manual validada na tela em 2026-06-28 (digitar filtra; cidade/LGND; "Nenhum"; sem travar)
