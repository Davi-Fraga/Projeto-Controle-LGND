## Why

O fluxo de TOP/Famílias ainda carrega participantes em dropdown, duplica observações do vínculo e apresenta o histórico de serviço do Legendário como se aceitasse apenas um TOP. Isso contradiz os dados reais: membros de Família já apontam para participantes do próprio TOP e o banco já possui `Legendary.topServants -> TopServant[]`, mas a UI/DTO usa somente o primeiro registro.

## What Changes

- Alterar o rótulo **“Família no primeiro TOP”** para **“Família”** no formulário, validação e perfil do Legendário, sem mudar a semântica de `firstTopFamilyId` nesta entrega.
- Substituir o dropdown de participante ao adicionar membro à Família pelo `AsyncCombobox` definido na change `busca-reutilizavel-entidades-e-listagens`; nenhum segundo componente ou mecanismo genérico de busca será criado.
- Migrar os seletores de representante e sub-representante da Família para o adaptador canônico de Legendário da mesma change anterior, removendo a carga local de até 100 Legendários.
- Reutilizar `GET /api/tops/:id/participants/options`, com `OptionsQueryDto`, normalização canônica e proteção do `TopScopeGuard`/`AccessPolicyService`, retornando somente participantes elegíveis daquele TOP e nunca a lista geral de Legendários.
- Definir “subiu neste TOP” como um `TopParticipant` do `topEventId` solicitado, não excluído e com status diferente de `CANCELLED`; para inclusão em Família, opções já vinculadas a uma Família ativa do mesmo TOP serão omitidas.
- Consolidar `TopFamilyMember.notes` e `sourceNotes` em uma única observação geral (`notes`), com campo inicialmente vazio para novos vínculos e migration sem perda dos textos existentes.
- Exibir e editar vários registros de serviço no perfil do Legendário, mudando a frase para **“Já serviu em algum TOP”**.
- Manter `TopServant` como fonte única do histórico 1:N já existente. A auditoria do schema mostrou que não há coluna escalar de “TOP servido” em `Legendary`; a limitação atual está em `topServants[0]` e nos campos escalares do DTO. Não será criada uma tabela paralela nem copiado dado que já está na relação correta.
- Evoluir o contrato do perfil de campos escalares (`serviceTopEventId`, `serviceTeamId`, `serviceRole`, `serviceNotes`) para uma coleção explícita de participações de serviço, preservando registros existentes e suas referências.
- Adicionar migration idempotente para consolidação de observações e índice de consulta do histórico, acompanhada de preview somente leitura, backup obrigatório, validação pós-deploy e rollback documentado.
- Adicionar testes de elegibilidade/escopo, autocomplete, consolidação de dados, múltiplos TOPs e regressão dos vínculos existentes.

## Capabilities

### New Capabilities

- `top-family-member-flow`: seleção escopada de participantes do próprio TOP, rótulo simplificado de Família e observação única do vínculo.
- `legendary-top-service-history`: leitura e edição de múltiplos TOPs servidos a partir da relação `TopServant[]`, com migração/deploy seguro e sem perda de histórico.

### Modified Capabilities

Nenhuma. A change depende do componente e das garantias de `legendario-autocomplete` definidos em `busca-reutilizavel-entidades-e-listagens`, mas não altera esse contrato nem cria outra implementação.

## Impact

- **Web**: `apps/web/src/features/tops/top-families-section.tsx`, adaptador de opções de participantes em `features/tops`, `apps/web/src/features/legendarios/legendario-form.tsx` e perfil de Legendário.
- **API**: `tops.controller/service/dto`, `legendarios.controller/service/dto`, validação com `TopScopeGuard`/`AccessPolicyService` e auditoria/histórico.
- **Shared**: tipos de `TopFamilyMember`, `TopServant` e payload de Legendário.
- **Banco**: consolidação e remoção de `TopFamilyMember.sourceNotes`; índice de leitura do histórico em `TopServant`. Os registros de serviço existentes permanecem na própria `TopServant`.
- **Operação**: preview SQL, backup de produção, migration transacional/idempotente, verificação de contagens e rollback antes de remover qualquer compatibilidade temporária.
- **Dependência de change**: implementar `busca-reutilizavel-entidades-e-listagens` antes ou no mesmo release, respeitando sua ordem de tarefas e testes.
