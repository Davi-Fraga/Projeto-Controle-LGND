## ADDED Requirements

### Requirement: Endpoint dedicado de listagem de igrejas, sem quebrar a referência global

O sistema SHALL expor um endpoint dedicado de listagem de igrejas com busca, filtros e paginação, protegido por `JwtAuthGuard` + `PermissionsGuard` com `@Permissions('churches.read')`. O endpoint global `GET /churches` (lista completa não paginada, usado como referência de dropdowns) SHALL permanecer inalterado. A rota estática dedicada SHALL ser declarada antes das rotas parametrizadas (`GET /churches/:id`).

#### Scenario: Listagem paginada e buscável
- **WHEN** um usuário com `churches.read` consulta o endpoint dedicado com parâmetros de busca/filtro/paginação
- **THEN** recebe uma página de igrejas filtradas com metadados de paginação (`page`, `perPage`, `total`, `totalPages`)

#### Scenario: Referência global preservada
- **WHEN** um consumidor chama `GET /churches`
- **THEN** continua recebendo a lista completa de igrejas, sem paginação nem escopo, como antes

### Requirement: Busca textual por nome e aliases, sem acento e sem caixa

A busca SHALL aplicar o termo no backend, no `where` do Prisma, sobre o conjunto completo de igrejas e ANTES de paginar. A busca SHALL encontrar correspondências independentemente de acento e de maiúsculas/minúsculas, usando a mesma normalização já adotada no sistema (sem acento, minúsculo, espaços colapsados), sobre uma coluna `searchText` normalizada de `Church` (nome + cidade) E sobre os aliases da igreja (`ChurchAlias.normalizedAlias`). O `where` de busca NÃO SHALL incluir cláusula vazia (`contains: ''`) que casaria todas as igrejas. O frontend NÃO SHALL filtrar localmente apenas a página carregada.

#### Scenario: Acha por sigla contida no nome
- **WHEN** o usuário busca `PIB` e existe "Primeira Igreja Batista (PIB)"
- **THEN** a igreja é encontrada

#### Scenario: Acha por alias
- **WHEN** o usuário busca `Primeira Batista` e esse texto é um alias da igreja
- **THEN** a igreja é encontrada pelo alias

#### Scenario: Indiferente a acento e caixa
- **WHEN** o usuário busca `sao joao` e existe "São João"
- **THEN** a igreja é encontrada

#### Scenario: Busca vazia não filtra
- **WHEN** o termo de busca está vazio
- **THEN** nenhuma cláusula de busca é aplicada e a listagem não é reduzida por busca (todas as igrejas do escopo permanecem elegíveis)

#### Scenario: searchText recomputado na escrita
- **WHEN** uma igreja é criada ou tem nome/cidade alterados
- **THEN** seu `searchText` é (re)calculado com a normalização padrão, mantendo a busca correta

### Requirement: Filtros de cidade, coordenadas e vínculo de legendários

O endpoint SHALL aceitar filtros por **cidade**, por **presença de coordenadas** (com/sem `latitude`/`longitude`) e por **presença de legendários vinculados** (com/sem legendários não excluídos). Os filtros SHALL ser aplicados no `where` do backend e SHALL combinar com a busca e a paginação sem que um quebre o outro.

#### Scenario: Filtrar por cidade
- **WHEN** o usuário filtra por uma cidade
- **THEN** apenas igrejas dessa cidade são retornadas

#### Scenario: Filtrar igrejas sem coordenadas
- **WHEN** o usuário filtra por "sem coordenadas"
- **THEN** apenas igrejas com `latitude`/`longitude` nulos são retornadas

#### Scenario: Filtrar igrejas sem legendários
- **WHEN** o usuário filtra por "sem legendários vinculados"
- **THEN** apenas igrejas sem nenhum legendário ativo vinculado são retornadas

#### Scenario: Busca + filtro + paginação combinados
- **WHEN** há termo de busca, um filtro e navegação de página simultâneos
- **THEN** todos são aplicados juntos no `where` do backend e a paginação opera sobre o resultado filtrado

### Requirement: Escopo de acesso na listagem de igrejas

A listagem dedicada SHALL respeitar o escopo de acesso do `AccessPolicyService`: usuários irrestritos (Administrador/COORDINATION_USER) veem todas as igrejas; usuários restritos SHALL ver e buscar apenas igrejas dentro do seu escopo. Um usuário restrito NÃO SHALL conseguir ver nem encontrar (via busca ou filtro) igrejas fora do seu escopo.

#### Scenario: Irrestrito vê todas
- **WHEN** um Administrador consulta a listagem
- **THEN** todas as igrejas são elegíveis (sujeitas a busca/filtro/paginação)

#### Scenario: Restrito não vê fora do escopo
- **WHEN** um usuário restrito consulta a listagem
- **THEN** apenas igrejas do seu escopo são retornadas

#### Scenario: Busca não vaza fora do escopo
- **WHEN** um usuário restrito busca por uma igreja que existe mas está fora do seu escopo
- **THEN** ela não é retornada

### Requirement: Front de busca/filtros no padrão existente, sem race

A tela de Igrejas SHALL reusar o padrão da tela de Legendários: enviar o termo de busca e os filtros ao backend (com debounce), refletir estados de carregando/resultado/vazio, e descartar respostas obsoletas (guarda anti-race) para que uma resposta mais antiga não sobrescreva a mais recente. A paginação SHALL seguir o padrão já usado nas demais listagens.

#### Scenario: Alterar termo dispara consulta com debounce
- **WHEN** o usuário altera o termo de busca
- **THEN** uma nova consulta é disparada com debounce e a página volta para a primeira

#### Scenario: Resposta obsoleta não sobrescreve
- **WHEN** uma requisição mais antiga retorna depois de uma mais recente
- **THEN** o resultado mais recente prevalece e a resposta obsoleta é descartada

#### Scenario: Paginação consistente
- **WHEN** há filtros/busca ativos e o usuário navega entre páginas
- **THEN** a paginação opera sobre o resultado filtrado, no padrão das demais telas
