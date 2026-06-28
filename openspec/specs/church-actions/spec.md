# church-actions Specification

## Purpose
TBD - created by archiving change acoes-igreja-listagem. Update Purpose after archive.
## Requirements
### Requirement: Menu de ações na listagem de Igrejas
A listagem de Igrejas SHALL exibir um menu de ações por linha, no padrão das demais telas do sistema, com as opções **Editar**, **Ver** e **Excluir**.

#### Scenario: Menu por linha
- **WHEN** a listagem de Igrejas é exibida
- **THEN** cada igreja apresenta um menu de ações com Editar, Ver e Excluir

#### Scenario: Editar abre o fluxo existente
- **WHEN** o usuário escolhe Editar em uma igreja
- **THEN** é levado ao fluxo de edição da igreja, com o comportamento atual preservado

### Requirement: Detalhes da Igreja com membros vinculados
A ação **Ver** SHALL abrir uma tela ou modal de detalhes apresentando todas as informações da igreja e a lista dos seus membros Legendários vinculados.

#### Scenario: Ver detalhes
- **WHEN** o usuário escolhe Ver em uma igreja
- **THEN** vê os dados completos da igreja e a lista de Legendários vinculados a ela

#### Scenario: Igreja sem membros
- **WHEN** o usuário abre os detalhes de uma igreja sem Legendários
- **THEN** a tela/modal indica que não há membros vinculados

### Requirement: Exclusão protegida de Igreja vazia
A exclusão de Igreja SHALL ser permitida somente quando a igreja não tiver nenhum Legendário vinculado. A validação de igreja vazia SHALL ocorrer no backend. A exclusão NÃO SHALL remover Legendários em cascata. Quando a igreja tiver Legendários vinculados, o backend SHALL bloquear a exclusão e retornar erro tratado, e o frontend SHALL exibir mensagem clara informando que a igreja não pode ser excluída por possuir Legendários vinculados.

#### Scenario: Excluir igreja vazia
- **WHEN** o usuário exclui uma igreja sem Legendários vinculados e confirma
- **THEN** o backend remove a igreja e a listagem é atualizada

#### Scenario: Exclusão bloqueada pelo backend
- **WHEN** o usuário tenta excluir uma igreja que tem Legendários vinculados
- **THEN** o backend recusa a exclusão (sem remover Legendários) e o frontend mostra mensagem clara do motivo

#### Scenario: Confirmação antes de excluir
- **WHEN** o usuário aciona Excluir em uma igreja vazia
- **THEN** o sistema solicita confirmação antes de remover o registro

#### Scenario: Validação no backend, não só no frontend
- **WHEN** uma requisição de exclusão de igreja com membros chega direto à API (sem passar pela UI)
- **THEN** o backend ainda assim recusa a exclusão

