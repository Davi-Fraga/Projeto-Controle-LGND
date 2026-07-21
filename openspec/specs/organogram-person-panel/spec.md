# organogram-person-panel Specification

## Purpose
TBD - created by archiving change organograma-navegacao-escalavel. Update Purpose after archive.
## Requirements
### Requirement: Painel lateral de detalhe da pessoa

Selecionar um nó de pessoa SHALL abrir um painel lateral com os dados da pessoa, seu vínculo hierárquico, o grupo/subdivisão atual, as ações permitidas para o usuário e um histórico resumido quando aplicável. O painel NÃO SHALL exigir sair da visualização do organograma.

#### Scenario: Abrir painel a partir do nó

- **WHEN** o usuário clica num nó de pessoa
- **THEN** o painel lateral abre mostrando dados, vínculo, grupo atual e ações permitidas, mantendo a árvore visível

#### Scenario: Histórico resumido quando disponível

- **WHEN** a pessoa tem histórico relevante (ex.: mudanças recentes de vínculo)
- **THEN** o painel exibe um resumo desse histórico

### Requirement: Edição de pessoa em painel lateral com permissão

A edição dos dados cadastrais da pessoa SHALL ocorrer no painel lateral e SHALL ser mais acessível que mover estrutura. A edição SHALL ser habilitada somente quando o usuário tiver a permissão de edição de pessoa. Salvar SHALL persistir via API, que SHALL revalidar a permissão antes de gravar.

#### Scenario: Editar com permissão

- **WHEN** um usuário com permissão de editar pessoa altera dados e salva
- **THEN** a API revalida a permissão e persiste a alteração, refletindo no painel

#### Scenario: Edição sem permissão é impossível ponta a ponta

- **WHEN** um usuário sem permissão de editar pessoa tenta salvar (inclusive forçando a chamada de API)
- **THEN** o backend recusa (403) e nada é persistido

### Requirement: Modo somente-leitura do painel

Quando o usuário tiver acesso de visualização mas não de edição, o painel SHALL abrir em modo somente-leitura, sem ações destrutivas e sem campos editáveis. A ausência de ações SHALL ser comunicada de forma clara.

#### Scenario: Painel read-only

- **WHEN** um usuário somente-leitura abre o painel de uma pessoa
- **THEN** vê os dados sem campos editáveis nem botões de ação estrutural, e entende que está em modo leitura

### Requirement: Edição parcial — só ações autorizadas

O painel SHALL exibir apenas as ações que o usuário está autorizado a executar. É válido um usuário poder editar dados cadastrais da pessoa e NÃO poder movê-la na hierarquia; nesse caso o painel mostra a edição e oculta/desabilita as ações estruturais.

#### Scenario: Editar sim, mover não

- **WHEN** um usuário tem permissão de editar pessoa mas não de mover
- **THEN** o painel oferece salvar dados cadastrais, mas as ações de mover/transferir/promover não aparecem ou aparecem desabilitadas com explicação

#### Scenario: Ação oculta na UI ainda é barrada no backend

- **WHEN** uma ação estrutural está oculta por falta de permissão e é chamada diretamente na API
- **THEN** o backend recusa a operação (403)
