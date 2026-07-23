## 1. Pré-requisitos e isolamento

- [x] 1.1 Reler `CLAUDE.md`, `docs/architecture.md`, esta change, `access-scope-semantics-hardening`, `controle-acessos-por-usuario` e `alinhar-abas-controle-acessos` antes de alterar código.
- [x] 1.2 Concluir o smoke manual 9.4 do hardening com os cenários COM escopo e SEM escopo, incluindo dashboard, `scopeMissing`, Igrejas/Legendários fora do escopo e bloqueio de escalonamento.
- [x] 1.3 Registrar o resultado real do smoke e corrigir primeiro qualquer regressão do hardening; não usar esta change para mascarar defeitos anteriores.
- [x] 1.4 Inventariar worktree, branch e sobreposição de arquivos somente com comandos Git de leitura.
- [x] 1.5 Apresentar ao Davi o plano de implementação, arquivos e ordem de migração e aguardar aval humano antes de editar código.
- [x] 1.6 Obter aval separado e atual antes de qualquer `git branch`, `switch`, `add`, `commit`, `push` ou PR; isolar a feature sem misturá-la à branch de outro tema.

## 2. Testes de contrato antes da implementação

- [x] 2.1 Escrever testes falhando para as invariantes persistidas `MISSING`, `SELECTED` e `ALL`.
- [x] 2.2 Escrever testes falhando para composição de escopo explícito com escopo derivado do papel.
- [x] 2.3 Escrever testes falhando da matriz `build*Where`/`assert*Allowed` para CITY, TEAM, CHURCH e TOP nos três modos.
- [x] 2.4 Escrever testes falhando do endpoint atômico para sucesso, validação integral, idempotência, conflito e auditoria.
- [x] 2.5 Escrever testes web falhando para multi-seleção preparada, Aplicar/Cancelar, troca de modo e erro sem sucesso parcial.
- [x] 2.6 Escrever testes falhando de `scopeMissing` para escopo efetivo satisfatório, derivado e apenas suplementar.

## 3. Persistência e migração

- [x] 3.1 Adicionar `UserScopeSelectionMode` com `SELECTED` e `ALL` ao schema Prisma.
- [x] 3.2 Adicionar `UserScopePolicy` com relação ao usuário, tipo, modo, timestamps e unicidade `(userId,type)`.
- [x] 3.3 Criar migration aditiva sem editar migrations já aplicadas.
- [x] 3.4 Implementar backfill idempotente de uma política `SELECTED` por par `(userId,type)` existente.
- [x] 3.5 Adicionar validação pré/pós-migração para políticas duplicadas, valores órfãos e pares inconsistentes.
- [x] 3.6 Validar em banco de teste que usuário sem `UserScope` continua `MISSING` e usuário com valores preserva exatamente o conjunto anterior.
- [x] 3.7 Documentar rollback seguro: preservar a tabela aditiva e aceitar fail-closed de configurações `ALL` no código antigo.

## 4. Contratos compartilhados e catálogo

- [x] 4.1 Adicionar tipos compartilhados de modo configurado/efetivo, fontes de escopo e estado normalizado por `UserScopeType`.
- [x] 4.2 Adicionar DTO compartilhado do `PUT` com `MISSING | SELECTED | ALL` e `values`.
- [x] 4.3 Evoluir o metadado de telas para distinguir `satisfyingScopeTypes` de `supplementalScopeTypes`, preservando a regra atual sem ampliar acesso.
- [x] 4.4 Declarar CITY/CHURCH como satisfatórios e TEAM como suplementar para Legendários.
- [x] 4.5 Revisar cada tela escopável e declarar suas dimensões satisfatórias conforme os builders canônicos.
- [x] 4.6 Adicionar testes de catálogo para unicidade, dimensões satisfatórias e ausência de `users`/`families` como telas concedíveis.
- [x] 4.7 Reconstruir `@central-da-manada/shared` e confirmar que API e web consomem os mesmos contratos.

## 5. Resolução canônica da política

- [x] 5.1 Fazer `AccessPolicyService.resolveScope` carregar `UserScopePolicy`, valores explícitos e vínculos derivados em uma única resolução coerente.
- [x] 5.2 Adicionar flags internas `allCities`, `allTeams`, `allChurches` e `allTops` sem alterar `isAdmin`.
- [x] 5.3 Implementar a precedência `ALL explícito > união SELECTED explícito + derivado > MISSING`.
- [x] 5.4 Normalizar e deduplicar valores efetivos, preservando a indicação de origem para o contrato administrativo.
- [x] 5.5 Atualizar builders de CITY, TEAM, CHURCH e TOP para `MISSING` negar, `SELECTED` filtrar e `ALL` remover apenas o predicado da dimensão.
- [x] 5.6 Atualizar asserts correspondentes para concordarem com os builders, preservando `404` fora de escopo nos endpoints endurecidos.
- [x] 5.7 Atualizar composição geográfica de Legendários para `CITY=ALL` representar todos os Legendários sem criar `LEGENDARY`.
- [x] 5.8 Preservar a decisão cross-type: `CITY=ALL` não autoriza a dimensão Igrejas quando `CHURCH` estiver ausente.
- [x] 5.9 Remover lógica paralela/fallback permissivo encontrada nos consumidores e direcioná-los ao serviço canônico.

## 6. API atômica de gerenciamento

- [x] 6.1 Criar DTO validado para o endpoint por tipo, com arrays vazios em `MISSING/ALL`, 1–500 UUIDs únicos em `SELECTED` e mensagens acionáveis.
- [x] 6.2 Criar `PUT /access-control/users/:userId/scopes/:type` protegido por JWT e papel `COORDINATION_ADMIN`.
- [x] 6.3 Validar em lote a existência e o tipo de todos os IDs antes de iniciar a substituição.
- [x] 6.4 Implementar transação que substitui valores, atualiza/remove política e mantém as invariantes em todos os modos.
- [x] 6.5 Retornar estado configurado e efetivo normalizado após a confirmação.
- [x] 6.6 Tornar repetições e ordens diferentes do mesmo conjunto idempotentes.
- [x] 6.7 Adaptar `POST` unitário para criar/manter `SELECTED` e responder `409 SCOPE_MODE_CONFLICT` quando a dimensão estiver em `ALL`.
- [x] 6.8 Adaptar `DELETE` unitário para transitar o último valor a `MISSING` e responder conflito em operações incompatíveis com `ALL`.
- [x] 6.9 Registrar um único `ACCESS_SCOPE_SELECTION_UPDATED` com ator, alvo, tipo e estados anterior/posterior.
- [x] 6.10 Garantir que falha de validação/transação não altere linhas nem produza auditoria de sucesso.

## 7. Contrato administrativo e scopeMissing

- [x] 7.1 Fazer a leitura do Controle de Acesso retornar, por tipo, modo/valores configurados, modo/valores efetivos e fontes.
- [x] 7.2 Calcular `scopeMissing` a partir das dimensões satisfatórias e do estado efetivo, não apenas de `screen.scopes`.
- [x] 7.3 Garantir que vínculo derivado satisfatório faça `scopeMissing=false`.
- [x] 7.4 Garantir que escopo apenas suplementar não esconda a falta do escopo principal de Legendários.
- [x] 7.5 Atualizar textos para distinguir “sem configuração explícita”, “selecionados” e “todos, inclusive novos cadastros”.
- [x] 7.6 Expor valores derivados como somente leitura, com origem compreensível, sem permitir falsa remoção.

## 8. Interface de seleção múltipla

- [x] 8.1 Criar/adaptar componente acessível de multi-seleção com busca assíncrona, checkboxes, chips e persistência entre pesquisas.
- [x] 8.2 Garantir navegação por teclado, foco, rótulos e estados de carregamento/vazio/erro.
- [x] 8.3 Manter seleção em estado preparado e impedir mutações antes de “Aplicar”.
- [x] 8.4 Implementar “Cancelar” restaurando exatamente o estado confirmado pela API.
- [x] 8.5 Implementar modos “Todos” e “Selecionados” por dimensão, sem buscar todas as páginas quando `ALL`.
- [x] 8.6 Exigir ao menos um item para aplicar `SELECTED` e oferecer ação explícita para deixar `MISSING`.
- [x] 8.7 Exibir confirmação/resumo ao trocar `ALL` por seleção restrita ou ao limpar o escopo.
- [x] 8.8 Rotular `CITY=ALL` como “Todas as cidades (todos os Legendários)” e explicar o compartilhamento com outras telas geográficas já concedidas.
- [x] 8.9 Exibir Igrejas, Equipes e TOPs em `ALL` com indicação de que novos cadastros serão incluídos.
- [x] 8.10 Tratar resposta de erro mantendo o último estado confirmado e sem sugerir sucesso parcial.
- [x] 8.11 Após sucesso, substituir o estado local pelo contrato normalizado retornado pela API.

## 9. Consumidores, dashboard e segurança

- [x] 9.1 Atualizar contadores do dashboard para `ALL` contar toda a dimensão somente quando a tela correspondente estiver permitida.
- [x] 9.2 Confirmar que permissão ausente mantém contador `null`/omitido mesmo com a dimensão em `ALL`.
- [x] 9.3 Atualizar listagens, detalhes, opções, relatórios e mapas afetados para consumir builders canônicos.
- [x] 9.4 Testar que `ALL` não concede `/access-control`, não altera papel, não concede escrita e não habilita redefinição de senha.
- [x] 9.5 Testar IDOR: fora de `SELECTED` retorna `404`; em `ALL`, o ID existente passa pelo escopo, mas continua sujeito à permission.
- [x] 9.6 Criar entidade depois da concessão `ALL` e provar por teste que ela aparece sem reconfiguração.

## 10. Verificação automatizada

- [x] 10.1 Executar testes focados de migration/política/access-control e corrigir toda regressão.
- [x] 10.2 Executar testes focados do painel, multi-select, catálogo e dashboard.
- [x] 10.3 Executar `pnpm --filter api test` e registrar contagem/resultado reais.
- [x] 10.4 Executar `pnpm --filter web test` e registrar contagem/resultado reais.
- [x] 10.5 Executar `pnpm -r lint` e registrar resultado real.
- [x] 10.6 Executar `pnpm --filter api build`; no Windows, não tratar EPERM de symlink do `web build` como falha de código quando tsc/lint estiverem verdes.
- [x] 10.7 Executar `openspec validate access-scope-bulk-selection --strict` e corrigir todos os erros/avisos relevantes.

## 11. Smoke e entrega

- [x] 11.1 Criar `MEMBER` com permissões de Legendários/Igrejas e escopos selecionados; validar Painel, listagens, detalhes e `404` fora do escopo.
- [x] 11.2 Remover os escopos efetivos; validar dados vazios/omitidos, `scopeMissing` e fail-closed.
- [x] 11.3 Configurar “Todos” para Igrejas, Equipes, TOPs e geografia; validar dados atuais e um cadastro criado depois da concessão.
- [x] 11.4 Em todos os cenários, validar `403` em `/access-control`, ausência de reset de senha e ausência de ações de escrita não concedidas.
- [x] 11.5 Validar usuário com escopo derivado e confirmar que a UI explica por que limpar explícitos não remove o derivado.
- [x] 11.6 Revisar o diff com atenção especial a migration, guards, `AccessPolicyService`, dashboard e contratos compartilhados.
- [x] 11.7 Entregar evidências de testes/smokes e limitações reais; só marcar tarefas `[x]` com prova concreta.
- [x] 11.8 Não executar qualquer escrita Git sem novo aval explícito do Davi na mesma interação.
