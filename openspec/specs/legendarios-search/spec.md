# legendarios-search Specification

## Purpose
TBD - created by archiving change corrigir-busca-legendarios. Update Purpose after archive.
## Requirements
### Requirement: Busca aplicada no backend antes da paginação
A listagem de Legendários SHALL aplicar o termo de busca no backend, no `where` da query do Prisma, sobre o conjunto completo de Legendários e ANTES de paginar e ordenar. O frontend NÃO SHALL filtrar localmente apenas a página já carregada. O termo digitado SHALL ser enviado à API na requisição de listagem.

#### Scenario: Termo é enviado e aplicado
- **WHEN** o usuário digita um termo na busca da aba Legendários
- **THEN** o termo aparece na requisição enviada à API e o backend o aplica no `where` da query

#### Scenario: Busca no conjunto completo
- **WHEN** existe um Legendário correspondente que não está na página atualmente carregada
- **THEN** ele é encontrado, porque a busca consulta o conjunto completo antes de paginar

### Requirement: Busca case-insensitive e tolerante a acento
A busca SHALL encontrar correspondências independentemente de maiúsculas e minúsculas. A busca sem acento SHALL encontrar nomes equivalentes com acento (ex.: `joao` encontra `João`), conforme a estratégia de busca sem acento aprovada para o PostgreSQL na fase de investigação.

#### Scenario: Indiferente a caixa
- **WHEN** o usuário busca `MARIA` e existe `maria`/`Maria`
- **THEN** o registro é encontrado

#### Scenario: Indiferente a acento
- **WHEN** o usuário busca `joao` e existe `João`
- **THEN** o registro é encontrado

### Requirement: Disparo correto e anti-race no campo de busca
Alterar ou limpar o termo SHALL disparar a consulta correta, com debounce, e respostas obsoletas NÃO SHALL sobrescrever o resultado atual. O campo SHALL refletir os estados de loading, resultado e vazio.

#### Scenario: Alterar termo dispara consulta
- **WHEN** o usuário altera o termo digitado
- **THEN** uma nova consulta é disparada (com debounce) e a lista é atualizada

#### Scenario: Limpar termo restaura a listagem
- **WHEN** o usuário limpa o campo de busca
- **THEN** a listagem volta ao estado sem filtro de busca

#### Scenario: Resposta obsoleta não sobrescreve
- **WHEN** uma requisição mais antiga retorna depois de uma mais recente
- **THEN** o resultado mais recente prevalece e a resposta obsoleta é descartada

### Requirement: Busca coexiste com paginação, ordenação e filtros
A busca SHALL funcionar em conjunto com paginação, ordenação e os demais filtros existentes, sem que um quebre o outro.

#### Scenario: Busca + paginação
- **WHEN** há um termo de busca ativo e o usuário navega entre páginas
- **THEN** a paginação opera sobre o resultado filtrado pela busca

#### Scenario: Busca + outros filtros
- **WHEN** há um termo de busca e outro filtro aplicados simultaneamente
- **THEN** ambos são aplicados em conjunto na query do backend

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

