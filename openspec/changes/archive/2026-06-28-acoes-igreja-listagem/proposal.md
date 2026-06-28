## Why

A listagem de Igrejas não tem o menu de ações por linha que as outras telas já oferecem. Depois da importação dos 226 Legendários, ficou necessário conferir igrejas e seus membros e administrar registros — inclusive remover igrejas vazias com segurança. Sem o menu de ações e uma exclusão protegida, a conferência pós-importação fica manual e arriscada.

## What Changes

- Adiciona um **menu de ações por linha** na listagem de Igrejas, no padrão das outras telas, com **Editar**, **Ver** e **Excluir**.
- **Editar** abre o fluxo de edição existente.
- **Ver** abre uma tela/modal de detalhes com todas as informações da igreja e a lista dos seus membros Legendários vinculados (facilita a conferência dos dados reais).
- **Excluir** remove a igreja **somente quando ela estiver vazia**. A validação de igreja vazia SHALL acontecer no **backend**, não apenas no frontend, e NÃO SHALL haver exclusão em cascata de Legendários.
- Quando a exclusão for bloqueada (igreja com Legendários vinculados), o backend retorna erro tratado e o frontend mostra mensagem clara explicando o motivo.

## Capabilities

### New Capabilities
- `church-actions`: menu de ações na listagem de Igrejas (Editar / Ver / Excluir), com tela/modal de detalhes incluindo membros vinculados, e exclusão protegida que o backend bloqueia quando a igreja tem Legendários, sem cascata.

### Modified Capabilities
<!-- Nenhuma spec canônica em openspec/specs/ para Igrejas. Editar reaproveita o fluxo existente; o novo comportamento é descrito como requisito da capability church-actions. -->

## Impact

- **Affected specs**: nova capability `church-actions`.
- **Affected code**:
  - API: módulo `apps/api/src/modules/churches` — endpoint/serviço de exclusão com validação de igreja vazia (contagem de Legendários vinculados) no backend; endpoint/serviço de detalhes com membros, se ainda não existir. Protegidos pelas permissions de Igrejas existentes.
  - Web: feature de Igrejas — menu de ações por linha na listagem (padrão das demais telas), tela/modal de detalhes com membros, confirmação de exclusão e tratamento do erro de exclusão bloqueada.
- **Affected data**: nenhuma migração. Não altera o model `Church` nem remove Legendários (sem cascata).
- **Risco**: baixo/médio — a operação destrutiva (excluir) é a parte sensível; mitigada por validação no backend (igreja vazia) e confirmação no frontend. Mantém permissões e escopo existentes; não altera auth, CORS, refresh token, Prisma bootstrap ou config global.
