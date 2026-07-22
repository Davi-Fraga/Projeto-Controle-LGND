## ADDED Requirements

### Requirement: Busca opcional nas listagens de Igrejas
`GET /churches` e `GET /churches/spiritual-leaders` SHALL aceitar um parâmetro opcional `search`. A ausência do parâmetro ou um termo que se torne vazio após normalização SHALL preservar o formato de resposta, a ordenação e o conjunto aplicável ao usuário.

#### Scenario: Requisição sem termo permanece compatível
- **WHEN** um cliente chama uma das listagens sem `search`
- **THEN** recebe o mesmo formato de array e a mesma ordenação por Igreja usados antes da mudança

#### Scenario: Termo vazio equivale a ausência
- **WHEN** um cliente envia `search` contendo somente espaços
- **THEN** a listagem aplica apenas seu escopo e não adiciona filtro textual vazio

### Requirement: Busca de Igreja por nome canônico e alias
A listagem de Igrejas SHALL normalizar o termo sem acento, em minúsculas e com espaços colapsados. Ela SHALL retornar a Igreja canônica quando o termo parcial corresponder a `Church.normalizedName` ou a `ChurchAlias.normalizedAlias`, sem duplicar uma Igreja que possua múltiplos aliases correspondentes.

#### Scenario: Nome canônico sem acento
- **WHEN** o usuário pesquisa `sao jose`
- **THEN** uma Igreja canônica chamada `São José` dentro do seu escopo aparece no resultado

#### Scenario: Alias resolve para Igreja canônica
- **WHEN** o termo corresponde parcialmente a um alias normalizado
- **THEN** o resultado contém a Igreja dona do alias com seu nome canônico

#### Scenario: Múltiplos aliases não duplicam Igreja
- **WHEN** dois aliases da mesma Igreja correspondem ao termo
- **THEN** a Igreja aparece uma única vez no resultado

### Requirement: Busca de Líderes Espirituais por Igreja ou líder
`GET /churches/spiritual-leaders` SHALL localizar registros pelo nome canônico ou alias da Igreja e também pelo nome do usuário líder vinculado ou pelo nome livre legado do líder espiritual.

#### Scenario: Busca por nome do usuário líder
- **WHEN** o termo corresponde ao nome do usuário vinculado como líder espiritual
- **THEN** a Igreja desse líder aparece no resultado se estiver no escopo do solicitante

#### Scenario: Busca por nome livre legado
- **WHEN** não há usuário vinculado e o termo corresponde a `spiritualLeaderName`
- **THEN** a Igreja aparece no resultado se estiver no escopo do solicitante

#### Scenario: Busca por Igreja na aba de líderes
- **WHEN** o termo corresponde ao nome canônico ou alias de uma Igreja
- **THEN** o card dessa Igreja aparece na aba Líderes Espirituais

### Requirement: Escopo de Igreja é obrigatório em ambas as listagens
As duas listagens MUST resolver o usuário autenticado pelo `AccessPolicyService` e MUST combinar o filtro de escopo com o filtro textual por interseção. A busca NÃO SHALL ampliar a visibilidade, e Igrejas com `deletedAt` preenchido NÃO SHALL ser retornadas.

#### Scenario: Usuário restrito sem termo
- **WHEN** um usuário restrito chama `GET /churches` sem busca
- **THEN** recebe somente Igrejas permitidas pelo seu escopo

#### Scenario: Correspondência fora do escopo
- **WHEN** o termo corresponde a uma Igreja ou líder fora do escopo do usuário
- **THEN** essa Igreja não aparece no resultado

#### Scenario: Correspondência dentro e fora do escopo
- **WHEN** o mesmo termo corresponde a Igrejas dentro e fora do escopo
- **THEN** somente as correspondências dentro do escopo são retornadas

### Requirement: Páginas pesquisam com debounce e proteção anti-race
As abas Igrejas e Líderes Espirituais SHALL enviar o termo ao backend com debounce e SHALL ignorar respostas, erros e finalizações de requisições anteriores à busca mais recente. Cada página SHALL distinguir carregamento inicial, busca em andamento, resultado vazio e erro.

#### Scenario: Digitação rápida
- **WHEN** o usuário digita várias teclas dentro da janela de debounce
- **THEN** a página não envia uma requisição para cada tecla

#### Scenario: Respostas fora de ordem
- **WHEN** a resposta do termo anterior chega depois da resposta do termo atual
- **THEN** a página mantém os dados do termo atual

#### Scenario: Busca sem resultados
- **WHEN** a requisição mais recente termina com sucesso sem Igrejas
- **THEN** a página exibe uma mensagem de nenhum resultado para a busca

#### Scenario: Falha na busca
- **WHEN** a requisição mais recente falha
- **THEN** a página exibe o estado de erro sem apresentar a falha como lista vazia

### Requirement: Nome normalizado de Igreja permanece consistente
Toda Igreja SHALL possuir `normalizedName` derivado pela normalização canônica compartilhada. Criação, alteração de nome e backfill de registros existentes MUST manter esse campo coerente com `name`.

#### Scenario: Criação com acento e espaços
- **WHEN** uma Igreja chamada `  São   José ` é criada
- **THEN** seu nome normalizado persistido é `sao jose`

#### Scenario: Alteração de nome
- **WHEN** o nome canônico de uma Igreja é alterado
- **THEN** `normalizedName` é atualizado na mesma operação

#### Scenario: Registros anteriores à migration
- **WHEN** a migration é aplicada sobre Igrejas existentes
- **THEN** todas recebem um `normalizedName` antes de a coluna se tornar obrigatória

### Requirement: Resumos da aba Líderes refletem o filtro atual
Enquanto houver uma busca aplicada, os cards de quantidade da aba Líderes Espirituais SHALL ser calculados a partir do conjunto de Igrejas retornado para o termo atual.

#### Scenario: Resumo após filtrar
- **WHEN** a busca reduz a lista visível para uma Igreja
- **THEN** os totais de Igrejas, Igrejas com líder e Legendários vinculados são recalculados a partir desse resultado
