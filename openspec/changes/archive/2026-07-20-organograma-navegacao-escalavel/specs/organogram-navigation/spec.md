## ADDED Requirements

### Requirement: Não renderizar a árvore inteira por padrão

O Organograma NÃO SHALL renderizar toda a hierarquia expandida ao abrir. Os nós SHALL vir recolhidos por padrão, e cada nível de filhos SHALL ser carregado sob demanda ao expandir. A interface SHALL limitar a quantidade de nós simultaneamente visíveis, exigindo expansão manual além desse limite.

#### Scenario: Abertura mostra visão resumida

- **WHEN** o usuário abre o Organograma de um escopo (equipe, cidade, TOP ou coordenadores)
- **THEN** a estrutura aparece resumida (raiz + primeiro nível recolhido), sem toda a árvore aberta

#### Scenario: Filhos carregam sob demanda

- **WHEN** o usuário expande um nó que ainda não teve os filhos carregados
- **THEN** os filhos daquele nó são buscados no backend naquele momento (lazy) e anexados, sem carregar a árvore inteira

#### Scenario: Limite de nós visíveis

- **WHEN** um nível tem mais nós do que o limite de exibição
- **THEN** a interface mostra até o limite e oferece expansão/carregar-mais para o restante, sem despejar todos de uma vez

### Requirement: Overview + detail com foco contextual

A interface SHALL adotar o padrão overview + detail: uma visão macro da estrutura e o foco no nó selecionado. Ao focar um nó, a visualização SHALL destacar o caminho ativo (pais, filhos, irmãos e grupo atual) e reduzir o peso visual do restante. O usuário SHALL conseguir retornar rapidamente ao contexto anterior.

#### Scenario: Focar um nó destaca o caminho ativo

- **WHEN** o usuário seleciona um nó
- **THEN** o nó em foco, seus pais (trilha até a raiz), filhos diretos e irmãos são destacados, e o restante fica atenuado

#### Scenario: Retorno ao contexto anterior

- **WHEN** o usuário está focado em um nó e aciona "voltar"/recentralizar
- **THEN** a visualização retorna ao contexto anterior sem recarregar toda a página

### Requirement: Breadcrumb da trilha hierárquica

A interface SHALL exibir um breadcrumb com a trilha do nó atual até a raiz do escopo. Clicar em um item do breadcrumb SHALL focar aquele ancestral.

#### Scenario: Breadcrumb reflete a trilha

- **WHEN** o usuário navega até um nó em profundidade
- **THEN** o breadcrumb mostra a sequência raiz → ... → nó atual

#### Scenario: Navegar pelo breadcrumb

- **WHEN** o usuário clica em um ancestral no breadcrumb
- **THEN** o foco muda para aquele ancestral

### Requirement: Minimap e controles espaciais

A interface SHALL oferecer um minimap/visão resumida da estrutura e controles de zoom, pan e recentralizar. O minimap SHALL indicar a posição do foco atual dentro da estrutura maior.

#### Scenario: Minimap mostra a posição atual

- **WHEN** o usuário está focado em um nó
- **THEN** o minimap indica onde esse foco está na estrutura geral

#### Scenario: Recentralizar

- **WHEN** o usuário perde a orientação após zoom/pan e aciona recentralizar
- **THEN** a visualização reenquadra no nó em foco

### Requirement: Busca integrada à visualização

A busca SHALL permitir localizar pessoa, equipe, coordenador, cidade ou TOP e, ao selecionar um resultado, focar e revelar o nó correspondente (expandindo o caminho necessário sob demanda), respeitando o escopo de acesso do usuário. A busca NÃO SHALL revelar nós fora do escopo autorizado.

#### Scenario: Buscar e focar

- **WHEN** o usuário busca uma pessoa e seleciona o resultado
- **THEN** a visualização expande o caminho até ela (lazy) e a coloca em foco

#### Scenario: Busca respeita escopo

- **WHEN** um usuário restrito busca alguém fora do seu escopo
- **THEN** o resultado não aparece e o nó não é revelado

### Requirement: Representação de subdivisões dentro da estrutura maior

Subdivisões (grupos de gestão de até 10 pessoas, derivadas dos vínculos persistidos) SHALL ser representadas de forma compreensível dentro da estrutura maior, com contagem de ocupação (ex.: "7/10") e distinção visual entre gestor, subdivisão e integrante. Isso NÃO SHALL exigir abrir todas as subdivisões ao mesmo tempo.

#### Scenario: Subdivisão mostra ocupação

- **WHEN** o usuário vê um gestor com sua subdivisão
- **THEN** a subdivisão exibe a contagem de ocupação em relação ao teto de 10

#### Scenario: Subdivisões permanecem recolhidas

- **WHEN** há várias subdivisões sob um mesmo nível
- **THEN** elas aparecem recolhidas por padrão e expandem individualmente sob demanda

### Requirement: Estados de leitura da visualização

A visualização SHALL tratar explicitamente os estados de carregando, vazio, erro e sem-acesso ao carregar níveis sob demanda, sem quebrar a navegação.

#### Scenario: Erro ao expandir não quebra a árvore

- **WHEN** a busca de filhos de um nó falha
- **THEN** o nó indica o erro e permite tentar novamente, sem derrubar o restante da visualização

#### Scenario: Nível vazio

- **WHEN** um nó não tem filhos
- **THEN** a interface indica que não há subordinados, sem estado de carregamento infinito
