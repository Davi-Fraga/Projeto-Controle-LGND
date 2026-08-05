## ADDED Requirements

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
