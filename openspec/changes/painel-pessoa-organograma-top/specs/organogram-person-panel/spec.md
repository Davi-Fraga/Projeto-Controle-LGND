## MODIFIED Requirements

### Requirement: Painel lateral de detalhe da pessoa

Selecionar um nó de pessoa SHALL abrir um painel lateral com os dados da pessoa, seu vínculo hierárquico, o grupo/subdivisão atual, as ações permitidas para o usuário e um histórico resumido quando aplicável. O painel NÃO SHALL exigir sair da visualização do organograma.

Este requisito SHALL valer em **todas** as visões do organograma, sem exceção por escopo: Equipes, Coordenadores, Cidades e as três visões do escopo TOPs (Equipes do TOP, Chefes de Família e Cidades do TOP). Uma visão que renderiza pessoas mas não abre o painel SHALL ser considerada em violação deste requisito.

#### Scenario: Abrir painel a partir do nó

- **WHEN** o usuário clica num nó de pessoa
- **THEN** o painel lateral abre mostrando dados, vínculo, grupo atual e ações permitidas, mantendo a árvore visível

#### Scenario: O clique no cartão é caminho suficiente

- **WHEN** o usuário quer ver os dados de uma pessoa visível na árvore
- **THEN** clicar no cartão dela basta — abrir o painel NÃO SHALL depender de usar a busca por nome, que é atalho e não o único caminho

#### Scenario: Histórico resumido quando disponível

- **WHEN** a pessoa tem histórico relevante (ex.: mudanças recentes de vínculo)
- **THEN** o painel exibe um resumo desse histórico

#### Scenario: Painel abre nas visões do escopo TOPs

- **WHEN** o usuário está no escopo TOPs, em qualquer uma das visões (Equipes do TOP, Chefes de Família ou Cidades do TOP), e clica num nó de pessoa — servo, coordenador, vice-coordenador, chefe de família, vice-representante, membro de família ou participante
- **THEN** o painel lateral abre com os dados daquela pessoa, do mesmo modo que nas demais visões

#### Scenario: Painel do TOP abre em modo leitura

- **WHEN** o painel abre a partir de um nó do escopo TOPs
- **THEN** as ações de mover pessoa entre gestores NÃO aparecem, porque a hierarquia do TOP não é reordenável por esse fluxo, e o painel se comporta conforme o modo somente-leitura já especificado

#### Scenario: Escopo do usuário continua governando os dados exibidos

- **WHEN** um usuário enxerga um nó de pessoa numa visão do TOP mas não tem escopo sobre aquele Legendário
- **THEN** o painel abre e a busca dos dados é recusada pela API escopada, exibindo a mensagem de indisponibilidade em vez dos dados pessoais

## ADDED Requirements

### Requirement: Nó de pessoa identifica o Legendário

Todo nó de organograma que representa uma pessoa — de qualquer tipo (`person` ou `leader`), em qualquer visão de qualquer escopo — SHALL carregar o identificador do Legendário correspondente no payload da árvore. Esse identificador é a pré-condição para o painel lateral: sem ele o nó é inerte e o requisito do painel não pode ser cumprido.

Nós que não representam pessoa (raiz, grupo, equipe, família, cidade) NÃO SHALL carregar esse identificador.

#### Scenario: Toda pessoa da árvore é identificável

- **WHEN** qualquer visão do organograma é requisitada pela API
- **THEN** todo nó do tipo `person` ou `leader` da árvore devolvida traz o id do Legendário correspondente

#### Scenario: Nó sem pessoa não traz identificador

- **WHEN** a árvore contém nós de raiz, grupo, equipe, família ou cidade
- **THEN** esses nós não trazem id de Legendário, e o clique neles mantém o comportamento de expandir/recolher sem abrir painel

#### Scenario: Pessoa sem Legendário vinculado

- **WHEN** um registro exibido como pessoa na árvore não tem Legendário vinculado nos dados
- **THEN** o nó é renderizado com o rótulo disponível e sem identificador, e o clique não abre o painel — sem erro para o usuário
