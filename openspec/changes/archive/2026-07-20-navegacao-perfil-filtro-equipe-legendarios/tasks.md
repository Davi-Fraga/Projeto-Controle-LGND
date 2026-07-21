## 1. Aprovação e reconciliação

- [x] 1.1 Registrar aprovação explícita da Opção A e da leitura de perfil por vínculo ativo em equipe autorizada; se a Opção B for escolhida, revisar proposal, design, specs e tarefas antes de codar
- [x] 1.2 Reconciliar este change com `controle-acessos-por-usuario` e mudanças concorrentes nos arquivos de acesso, sem sobrescrever trabalho em andamento

## 2. Contratos de permissão e escopo

- [x] 2.1 Implementar metadado/decorator e suporte de guard para permissões any-of, mantendo o comportamento all-of de `@Permissions`
- [x] 2.2 Adicionar ao `AccessPolicyService` um filtro específico de detalhe de Legendário que combine escopo geográfico OU vínculo ativo em `scope.teamIds`
- [x] 2.3 Aplicar a permissão `legendarios.read` OU `teams.members.read` e o filtro de detalhe somente a `GET /legendarios/:id`
- [x] 2.4 Adicionar testes do guard e da policy para perfil permitido, equipe fora do escopo, ausência de escopo e vínculo inativo/excluído

## 3. Backend do filtro de equipe

- [x] 3.1 Adicionar `teamId` ao DTO de consulta e aos tipos compartilhados de filtros de Legendários
- [x] 3.2 Validar o `teamId` contra `buildTeamWhere` e combinar `teamMemberships.some` ativo com o `buildLegendaryWhere` geográfico existente
- [x] 3.3 Passar `@CurrentUser` a `GET /teams/options` e aplicar `resolveScope` + `buildTeamWhere` no service antes de buscar opções
- [x] 3.4 Testar filtro por equipe, combinação com busca/paginação, vínculo inativo, equipe fora do escopo e administrador irrestrito

## 4. Navegação de membro para perfil

- [x] 4.1 Transformar o nome/ação do membro em link acessível para o perfil existente, levando `fromTeamId` apenas como contexto de retorno
- [x] 4.2 Adaptar o perfil para voltar à equipe quando houver contexto válido e ocultar Editar Cadastro sem `legendarios.update`
- [x] 4.3 Renderizar/consultar histórico somente com `legendarios.history.read`, sem alterar permissões de leitura ou criação de histórico
- [x] 4.4 Testar navegação por mouse/teclado, retorno à equipe e ausência de ações sem permissão

## 5. Filtro na listagem de Legendários

- [x] 5.1 Reusar o cliente de options de equipes com busca/limite server-side e somente opções autorizadas
- [x] 5.2 Adicionar o controle de equipe à listagem e enviar `teamId` junto dos filtros existentes
- [x] 5.3 Reiniciar a página ao alterar/limpar equipe e manter debounce/anti-race da listagem
- [x] 5.4 Testar seleção, limpeza, combinação com busca e descarte de resposta obsoleta

## 6. Validação final

- [x] 6.1 Executar testes focados de API, web e compartilhados, além de lint/typecheck dos pacotes afetados
- [x] 6.2 Validar manualmente os cenários de administrador, gestor com equipe autorizada, vínculo inativo e usuário fora do escopo
- [x] 6.3 Confirmar que listagem sem `teamId`, Relatórios, Mapa, options de Legendários e mutações mantêm o comportamento anterior
- [x] 6.4 Validar todos os critérios dos delta specs e registrar evidências antes de solicitar arquivamento
