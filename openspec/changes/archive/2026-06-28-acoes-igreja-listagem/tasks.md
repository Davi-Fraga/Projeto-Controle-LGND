## 1. Inspeção

- [x] 1.1 Churches: controller tem read/spiritual-leaders/geocode/create/update; service sem findOne/remove. `Church.legendarios Legendary[]` + `deletedAt` (soft delete)
- [x] 1.2 Igrejas page já usa `ActionMenu` (só "Editar"); `ConfirmDialog` reutilizável existe; sem componente Modal genérico
- [x] 1.3 Não há endpoint de membros nem delete. "Vinculado" = `Legendary.churchId == id` e `deletedAt null`. `lib/api` ApiError só carrega `status` (não a mensagem) → mapear por status (409)
- [ ] 1.4 Apresentar os diffs propostos e aguardar aprovação antes de aplicar

## 2. Backend — detalhes e exclusão protegida

- [x] 2.1 `ChurchesService.findOne(id)` retorna a igreja + membros (`legendarios` `deletedAt null`); `GET /churches/:id` (`churches.read`)
- [x] 2.2 `remove(id)` conta legendarios vinculados; >0 → `ConflictException` (409); senão soft-delete (`deletedAt`) + audit; sem cascata
- [x] 2.3 Permissions: `GET/:id` = `churches.read`, `DELETE/:id` = nova `churches.delete` (seed idempotente + reseed); escopo mantido
- [x] 2.4 Testes (4): findOne com membros; findOne 404; remove soft-delete vazia; remove 409 com membros (sem tocar legendarios)

## 3. Frontend — menu de ações e detalhes

- [x] 3.1 `ActionMenu` por linha com Ver / Editar / Excluir (reusa o padrão das outras telas)
- [x] 3.2 Editar mantém o href do fluxo de edição existente
- [x] 3.3 Ver abre `ChurchDetailModal` (dados da igreja + lista de membros Legendários + contador)
- [x] 3.4 Excluir usa `ConfirmDialog`; em igreja vazia remove e atualiza a listagem
- [x] 3.5 Erro 409 mapeado por status → mensagem clara ("possui Legendários vinculados")

## 4. Verificação

- [x] 4.1 Testes focados (Igrejas): 21/21 ✓ (4 novos)
- [x] 4.2 `pnpm -r lint` ✓ (tsc web/api); `pnpm -r test` ✓ (api 116, web 11); build NÃO rodado de propósito (`next build` corrompe o `.next` do dev em uso); web validado via tsc do lint
- [x] 4.3 Conferência manual validada na tela em 2026-06-28 (igreja vazia exclui; com membros bloqueia; detalhes mostram membros)
