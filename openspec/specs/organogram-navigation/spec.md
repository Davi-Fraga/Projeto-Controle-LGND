# organogram-navigation Specification

## Purpose
TBD - created by archiving change organograma-navegacao-escalavel. Update Purpose after archive.
## Requirements
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

### Requirement: A árvore é operável por ponteiro

Todo nó renderizado no canvas do organograma SHALL receber eventos de ponteiro. Um clique de mouse sobre a área visível de um cartão SHALL acionar o comportamento daquele cartão — abrir o detalhe, expandir/recolher, selecionar um membro de bloco ou carregar mais — e NÃO SHALL ser absorvido pela camada de fundo do canvas.

A configuração da biblioteca de visualização SHALL manter os nós interativos. Desligar simultaneamente seleção, arraste e handlers de nó torna os nós inertes ao ponteiro e SHALL ser tratado como violação deste requisito, mesmo que os handlers existam dentro dos cartões.

Os estados visuais de `hover` e o cursor de ação dos cartões SHALL ser efetivos, já que dependem dos mesmos eventos de ponteiro.

#### Scenario: Clique alcança o cartão

- **WHEN** o usuário clica com o mouse sobre um cartão de nó em qualquer visão do organograma
- **THEN** o comportamento daquele cartão é acionado, e o alvo do evento é o cartão, não a camada de fundo do canvas

#### Scenario: Cartão sinaliza que é acionável

- **WHEN** o ponteiro passa sobre um cartão acionável
- **THEN** o cartão muda de estado visual e o cursor indica ação

#### Scenario: Arrastar pessoa continua disponível onde é permitido

- **WHEN** o usuário tem permissão de reordenar e arrasta a alça de uma pessoa numa visão que permite mover
- **THEN** o arraste inicia normalmente, porque o cartão recebe eventos de ponteiro

### Requirement: Expandir e abrir o detalhe são ações distintas

Num nó que representa uma pessoa **e** tem subordinados, expandir/recolher o ramo e abrir o detalhe da pessoa SHALL ter alvos de clique distintos. Um mesmo clique NÃO SHALL executar as duas ações.

O controle de expandir/recolher SHALL comunicar seu estado de forma acessível. Nós que não representam pessoa (raiz, grupo, equipe, família, cidade) NÃO precisam dessa separação: neles o cartão inteiro pode expandir/recolher, já que não há detalhe a abrir.

#### Scenario: Clicar no corpo de um nó de liderança abre o detalhe

- **WHEN** o usuário clica no nome de uma pessoa que lidera outras
- **THEN** o painel de detalhe abre e o ramo **não** muda de estado de expansão

#### Scenario: Clicar na seta expande ou recolhe

- **WHEN** o usuário clica no controle de expansão de um nó
- **THEN** o ramo expande ou recolhe e o painel de detalhe **não** abre

#### Scenario: Nó sem pessoa mantém o cartão inteiro como alvo

- **WHEN** o usuário clica num nó de raiz, grupo, equipe, família ou cidade
- **THEN** o ramo expande ou recolhe, sem painel

### Requirement: Recarregar o dado não descarta a navegação

Recarregar os dados da visão atual — por exemplo depois de uma ação do próprio usuário, como mover uma pessoa — NÃO SHALL ser tratado como troca de visão. A visualização SHALL preservar o nó em foco, o estado de expansão e qualquer painel ou aviso aberto no momento, e NÃO SHALL substituir a árvore por um estado de carregamento.

Trocar de visão — outro escopo, outra equipe, outra cidade, outro TOP — SHALL continuar voltando ao overview: sem foco, com o estado de expansão padrão.

#### Scenario: Ação do usuário mantém o contexto

- **WHEN** o usuário executa uma ação que exige rebuscar a árvore, estando com um nó em foco e o painel aberto
- **THEN** a árvore reflete a mudança e o foco, a expansão e o painel continuam como estavam

#### Scenario: A opção de desfazer sobrevive à atualização

- **WHEN** uma ação reversível é concluída e oferece "desfazer"
- **THEN** essa opção permanece visível e utilizável depois de a árvore ser atualizada

#### Scenario: Trocar de visão volta ao overview

- **WHEN** o usuário troca de escopo, equipe, cidade ou TOP
- **THEN** a visualização limpa o foco e reabre no estado resumido daquela visão

### Requirement: A árvore é operável por teclado

Os controles acionáveis de um cartão SHALL ser alcançáveis por tabulação e acionáveis por Enter e Espaço, expondo papel e estado. A visualização NÃO SHALL colocar na ordem de tabulação elementos que não executam ação alguma.

#### Scenario: Acionar por teclado

- **WHEN** o usuário navega por tabulação até o controle de um cartão e pressiona Enter ou Espaço
- **THEN** a mesma ação do clique de mouse é executada

#### Scenario: Sem paradas de tabulação inúteis

- **WHEN** o usuário percorre a visualização por tabulação
- **THEN** as paradas correspondem a controles que executam ação, sem nós inertes no caminho
