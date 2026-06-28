## 1. Inspeção

- [ ] 1.1 Inspecionar o módulo `apps/api/src/modules/churches` (service, controller, DTOs) e a relação `Church`↔`Legendary` no Prisma
- [ ] 1.2 Inspecionar a feature web de Igrejas e o padrão de menu de ações usado em outras telas (ex.: Legendários)
- [ ] 1.3 Verificar se já existe endpoint para os membros (Legendários) de uma igreja; conferir definição de "vinculado" (com `churchId`, soft delete)
- [ ] 1.4 Apresentar os diffs propostos e aguardar aprovação antes de aplicar

## 2. Backend — detalhes e exclusão protegida

- [ ] 2.1 Garantir endpoint/serviço de detalhes da igreja com a lista de Legendários vinculados
- [ ] 2.2 Implementar exclusão que conta Legendários vinculados e recusa quando > 0 (erro de domínio tratado pelo filtro padrão), sem cascata
- [ ] 2.3 Manter permissions/escopo existentes nos endpoints
- [ ] 2.4 Testes: excluir igreja vazia remove; excluir igreja com membros é bloqueada (sem remover Legendários); validação ocorre no backend mesmo via chamada direta

## 3. Frontend — menu de ações e detalhes

- [ ] 3.1 Adicionar menu de ações por linha (Editar / Ver / Excluir) reusando o padrão das outras telas
- [ ] 3.2 Editar aciona o fluxo de edição existente
- [ ] 3.3 Ver abre tela/modal de detalhes com dados da igreja + membros Legendários
- [ ] 3.4 Excluir solicita confirmação; em igreja vazia remove e atualiza a listagem
- [ ] 3.5 Tratar o erro de exclusão bloqueada com mensagem clara (igreja possui Legendários vinculados)

## 4. Verificação

- [ ] 4.1 Rodar testes focados (Igrejas)
- [ ] 4.2 Rodar `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` e reportar comandos/resultados exatos
- [ ] 4.3 Conferência manual: igreja vazia exclui após confirmação; igreja com membros é bloqueada com mensagem; detalhes mostram os membros corretos
