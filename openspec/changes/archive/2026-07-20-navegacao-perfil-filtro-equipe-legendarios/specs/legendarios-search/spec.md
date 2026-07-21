## ADDED Requirements

### Requirement: Listagem de Legendários filtra por equipe sem alterar visibilidade
A listagem de Legendários SHALL aceitar `teamId` opcional e aplicá-lo no backend antes da paginação. O filtro SHALL retornar somente Legendários com vínculo ativo e não excluído na equipe escolhida E já autorizados pelo escopo geográfico vigente. O filtro NÃO SHALL ampliar nem redefinir o conjunto que o usuário pode ver sem ele.

#### Scenario: Filtrar equipe autorizada
- **WHEN** o usuário escolhe uma equipe em seu escopo
- **THEN** a API retorna apenas membros ativos dessa equipe que também pertencem ao conjunto de Legendários já visível ao usuário

#### Scenario: Filtro não amplia escopo geográfico
- **WHEN** uma equipe autorizada possui membro fora das cidades e igrejas visíveis ao usuário
- **THEN** esse membro não aparece na listagem filtrada

#### Scenario: Vínculos inativos não aparecem
- **WHEN** um Legendário possui somente vínculo inativo ou excluído com a equipe filtrada
- **THEN** ele não aparece no resultado

### Requirement: Opções de equipe e parâmetro direto respeitam escopo
O endpoint reutilizado para opções de equipe SHALL aplicar `AccessPolicyService` e retornar somente equipes autorizadas ao usuário. A API de Legendários SHALL validar o `teamId` recebido independentemente do frontend e SHALL falhar sem revelar dados quando a equipe estiver fora do escopo.

#### Scenario: Opções de gestor são limitadas
- **WHEN** um gestor consulta opções de equipe
- **THEN** recebe somente equipes presentes em seu `scope.teamIds`

#### Scenario: Administrador consulta opções
- **WHEN** um administrador consulta opções de equipe
- **THEN** recebe equipes ativas conforme busca e limite, sem restrição de escopo

#### Scenario: ID de equipe fora do escopo
- **WHEN** um usuário envia manualmente `teamId` de uma equipe não autorizada
- **THEN** a API não retorna Legendários nem metadados que confirmem a existência da equipe

### Requirement: Filtro por equipe coexiste com controles existentes
O filtro por equipe SHALL funcionar em conjunto com busca, filtros, ordenação e paginação existentes. Alterar ou limpar a equipe SHALL reiniciar a paginação e participar da proteção anti-race da listagem.

#### Scenario: Equipe e busca combinadas
- **WHEN** o usuário seleciona uma equipe e digita um termo de busca
- **THEN** ambos são aplicados no backend sobre o mesmo conjunto autorizado

#### Scenario: Limpar equipe
- **WHEN** o usuário limpa o filtro de equipe
- **THEN** a listagem volta ao conjunto autorizado sem filtro de equipe e à primeira página

#### Scenario: Resposta obsoleta não sobrescreve filtro atual
- **WHEN** uma resposta de equipe anteriormente selecionada chega após uma consulta mais recente
- **THEN** a resposta antiga é descartada pela proteção anti-race existente
