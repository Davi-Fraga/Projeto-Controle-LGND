## 1. Baseline e helpers canônicos

- [x] 1.1 Registrar em testes a matriz atual de `MISSING`, `SELECTED`, `ALL`, derivado, permission ausente e ID externo para TEAM, TOP e CITY
- [x] 1.2 Inventariar todas as assinaturas de services afetadas que hoje recebem apenas `actorUserId`
- [x] 1.3 Consolidar no `AccessPolicyService` asserts por Equipe, TOP e Cidade coerentes com os builders existentes
- [x] 1.4 Adicionar testes unitários provando paridade entre builder e assert, inclusive `allTeams`, `allTops` e valores derivados

## 2. Equipes

- [x] 2.1 Alterar controller e service para passar `AuthenticatedUser` nas mutações escopáveis
- [x] 2.2 Aplicar assert de Equipe antes de editar Equipe e antes de adicionar, atualizar, inativar ou remover membresia
- [x] 2.3 Corrigir `findMembers` para aceitar `TEAM=ALL` pela policy canônica
- [x] 2.4 Preservar `user.sub` como ator das auditorias sem usá-lo como substituto do escopo
- [x] 2.5 Adicionar testes de mutação dentro/fora do escopo, `ALL`, derivado e ausência de escrita em `404`

## 3. Ações Sociais e sugestões

- [x] 3.1 Passar `AuthenticatedUser` a update, complete, cancel, delete, participants e mutações de participantes
- [x] 3.2 Validar a cidade da Ação Social antes de qualquer leitura de participante ou escrita
- [x] 3.3 Validar elegibilidade do Legendário antes de adicioná-lo como participante
- [x] 3.4 Fazer sugestões receberem o usuário e aplicarem `buildLegendaryWhere`
- [x] 3.5 Substituir spread do registro Prisma por projeção mínima tipada
- [x] 3.6 Adicionar testes de ação externa, participante externo, sugestões geográficas e ausência de PII

## 4. Pré-inscrições e opções de TOP

- [x] 4.1 Aplicar escopo de TOP à listagem e ao contador de pré-inscrições
- [x] 4.2 Aplicar `TopScopeGuard` nas rotas com `topEventId` e manter assert defensivo no service
- [x] 4.3 Resolver e validar o TOP nas rotas de detalhe e exclusão que recebem apenas o ID da pré-inscrição
- [x] 4.4 Cobrir aprovação e rejeição fora do escopo sem alteração de estado
- [x] 4.5 Fazer `TopsService.options` receber o usuário e aplicar `buildTopWhere`
- [x] 4.6 Adicionar testes para `TOP=MISSING`, `SELECTED`, `ALL`, ID externo, opções e contadores

## 5. Relatórios geográficos

- [x] 5.1 Criar helpers de consulta para aplicar `CITY` de forma uniforme aos conjuntos de Relatórios
- [x] 5.2 Refatorar `byChurch` e `byTeam` para contar apenas Legendários geograficamente visíveis
- [x] 5.3 Omitir grupos que não possuam qualquer registro visível e cuja presença revele entidade externa
- [x] 5.4 Validar a cidade do TOP em participantes, servos, famílias e respectivos exports
- [x] 5.5 Validar a cidade da Ação Social em participantes e export correspondente
- [x] 5.6 Escopar todos os ramos de `pendingReview`, inclusive TOPs, famílias, representantes e membros
- [x] 5.7 Garantir que exports reutilizem a consulta autorizada e exijam a permission de exportação
- [x] 5.8 Adicionar testes de paridade tela/CSV, `CITY=MISSING/SELECTED/ALL` e entidade-pai externa

## 6. Reset administrativo

- [x] 6.1 Trocar a geração de link para `RolesGuard` com `COORDINATION_ADMIN`
- [x] 6.2 Preservar validação e consumo públicos do token e o rate limit existente
- [x] 6.3 Adicionar teste de metadata e cenário de não-admin com `users.update` residual recebendo `403`

## 7. Verificação integrada

- [x] 7.1 Executar os testes focados dos helpers e módulos endurecidos
- [x] 7.2 Executar `pnpm --filter api test`
- [x] 7.3 Executar `pnpm -r lint` e `pnpm --filter api build`
- [x] 7.4 Fazer smoke com admin, `MISSING`, `SELECTED`, `ALL`, derivado e tentativa por ID externo
- [x] 7.5 Revisar respostas de sugestões, relatórios, opções e erros para confirmar ausência de dados externos
- [x] 7.6 Executar `openspec.cmd validate fechar-escopo-rotas-sensiveis`
