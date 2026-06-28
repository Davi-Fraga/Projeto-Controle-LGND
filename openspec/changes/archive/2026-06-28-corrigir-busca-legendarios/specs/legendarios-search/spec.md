## ADDED Requirements

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
