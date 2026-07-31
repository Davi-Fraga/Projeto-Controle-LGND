# legendary-top-service-history Specification

## Purpose
Histórico completo de serviço do legendário em TOPs: o perfil apresenta todos os `TopServant` como coleção (não apenas o primeiro), com inclusão, edição e cancelamento por registro, respeitando as permissions granulares de serviço.

## Requirements

### Requirement: TopServant é a fonte única do histórico de serviço
O sistema MUST representar TOPs servidos pela relação existente `Legendary.topServants -> TopServant[]`. Ele NÃO SHALL criar colunas escalares de TOP servido em `Legendary` nem uma tabela paralela de participação de serviço.

#### Scenario: Legendário serve em vários TOPs
- **WHEN** existem linhas ativas de `TopServant` para TOPs diferentes com o mesmo `legendaryId`
- **THEN** todas pertencem ao histórico de serviço do Legendário

#### Scenario: Nenhuma tabela paralela é criada
- **WHEN** o schema desta change é aplicado
- **THEN** `TopServant` permanece a única relação que registra serviço de Legendário em TOP

#### Scenario: Subida e serviço permanecem separados
- **WHEN** o histórico é consultado
- **THEN** `TopParticipant` representa quem subiu e `TopServant` representa quem serviu, sem mesclar os dois fatos

### Requirement: Perfil exibe múltiplos TOPs servidos
O perfil/formulário SHALL consumir a coleção completa `topServants`, sem limitar a `topServants[0]`, e SHALL apresentar a frase **“Já serviu em algum TOP”**. Cada item SHALL identificar TOP, equipe quando houver, função, observação e status necessários para gestão.

#### Scenario: Um serviço legado aparece
- **WHEN** o Legendário possui a única linha criada pelo formulário antigo
- **THEN** essa linha aparece no novo histórico sem backfill ou cópia

#### Scenario: Vários TOPs aparecem
- **WHEN** o Legendário possui três `TopServant` em TOPs diferentes
- **THEN** o perfil apresenta os três registros de forma independente

#### Scenario: Nenhum serviço
- **WHEN** não existe `TopServant` ativo para o Legendário
- **THEN** o perfil indica que ele ainda não serviu e permite iniciar uma inclusão se houver permissão

### Requirement: Inclusão, edição e cancelamento usam o fluxo canônico de TOP
O perfil SHALL usar os endpoints existentes `POST/PATCH/cancel /tops/:topId/servants` para mutar itens. Cada operação MUST preservar validação de TOP/equipe, audit, `LegendaryHistory`, soft delete e exclusão mútua com `TopParticipant`.

#### Scenario: Adicionar segundo TOP
- **WHEN** o Legendário já serviu em um TOP e o usuário adiciona outro TOP autorizado
- **THEN** uma nova linha `TopServant` é criada e a anterior permanece inalterada

#### Scenario: Editar item específico
- **WHEN** o usuário altera equipe, função ou observação de um serviço existente
- **THEN** somente o `TopServant.id` escolhido é atualizado e auditado

#### Scenario: Remover item específico
- **WHEN** o usuário cancela um serviço do histórico
- **THEN** somente esse item recebe status/deletedAt de cancelamento e os demais permanecem

#### Scenario: Pessoa já é participante do TOP
- **WHEN** existe `TopParticipant` ativo da pessoa no TOP selecionado
- **THEN** a inclusão como servo é rejeitada pela regra existente

### Requirement: Escopo e permissões se aplicam por TOP servido
Leitura e mutação do histórico MUST respeitar `AccessPolicyService`, `TopScopeGuard` e as permissões `tops.servants.read/add/update/remove`. Ver o perfil por `legendarios.read` NÃO SHALL conceder automaticamente permissão para alterar serviços.

#### Scenario: Perfil somente leitura
- **WHEN** o usuário pode ver o Legendário mas não possui permissão de mutação de servos
- **THEN** o histórico é exibido conforme autorizado e controles de adicionar/editar/remover não ficam disponíveis

#### Scenario: TOP fora do escopo
- **WHEN** o usuário tenta adicionar ou alterar serviço em TOP fora de `scope.topIds`
- **THEN** o `TopScopeGuard` nega a operação sem confirmar dados do TOP

#### Scenario: TOP autorizado
- **WHEN** o usuário possui permissão adequada e o TOP está no escopo
- **THEN** a operação segue para as validações de negócio do service

### Requirement: No máximo um serviço ativo por Legendário em cada TOP
O sistema MUST impedir duas linhas não canceladas/não excluídas de `TopServant` para o mesmo `(topEventId, legendaryId)`. A regra SHALL existir no service e ser reforçada por índice único parcial no PostgreSQL.

#### Scenario: Mesmo TOP duplicado
- **WHEN** duas inclusões ativas usam o mesmo TOP e Legendário
- **THEN** no máximo uma é persistida e a outra recebe conflito/erro de negócio

#### Scenario: TOPs diferentes são permitidos
- **WHEN** o mesmo Legendário é incluído como servo em TOPs diferentes
- **THEN** cada TOP possui sua própria linha ativa

#### Scenario: Registro cancelado preserva histórico
- **WHEN** um serviço anterior foi cancelado
- **THEN** ele permanece auditável e a política de reentrada segue as regras do service sem apagar o registro antigo

### Requirement: Dados atuais não são copiados nem descartados
A migração SHALL reconhecer que os dados atuais já residem em `TopServant`. Ela MUST preservar ids, FKs, status, função, equipe, observação, timestamps e contagens de todas as linhas. Nenhum backfill de “campo único” SHALL ser executado porque esse campo não existe no banco.

#### Scenario: Preview confirma fonte atual
- **WHEN** o preview é executado antes do deploy
- **THEN** ele lista contagens de `TopServant` por Legendário/TOP e não procura colunas escalares inexistentes em `Legendary`

#### Scenario: Contagens após migration
- **WHEN** a migration de índices/consolidação termina
- **THEN** a quantidade e os ids de `TopServant` são idênticos ao preview

#### Scenario: Perfil antigo com um item
- **WHEN** o formulário antigo havia salvo um único TOP servido
- **THEN** a nova UI lê a mesma linha, sem criar duplicata

### Requirement: Migration possui preview, backup e bloqueios
Antes de qualquer mudança de produção, o processo MUST executar preview somente leitura, produzir backup verificável e bloquear o deploy em caso de duplicidade ativa por `(topEventId, legendaryId)` ou divergência não revisada na consolidação de observações. SQL de schema/dados SHALL ser transacional e condicional/idempotente onde aplicável.

#### Scenario: Duplicidade ativa encontrada
- **WHEN** o preview encontra mais de um `TopServant` ativo para o mesmo Legendário/TOP
- **THEN** o deploy é interrompido e nenhuma linha é removida automaticamente

#### Scenario: Backup verificável
- **WHEN** o deploy é autorizado
- **THEN** existe backup com timestamp, tamanho e checksum conferidos antes da migration

#### Scenario: Reexecução segura
- **WHEN** um passo idempotente de índice ou expansão é reexecutado
- **THEN** `IF NOT EXISTS`/checagens de catálogo impedem duplicação ou perda de dados

### Requirement: Expansão e contrato ocorrem em fases
A remoção de `sourceNotes`, dos campos escalares de serviço no DTO e de `handleServiceInfo` MUST ocorrer somente após a aplicação nova operar durante uma janela de observação e uma segunda aprovação. A fase inicial SHALL manter compatibilidade suficiente para rollback da aplicação anterior.

#### Scenario: Rollback antes da fase de contrato
- **WHEN** a nova aplicação precisa ser revertida durante a janela de observação
- **THEN** a coluna `sourceNotes` e o contrato escalar ainda existem, permitindo reimplantar a versão anterior

#### Scenario: Remoção após aprovação
- **WHEN** validações pós-deploy passam e a janela termina
- **THEN** uma migration separada pode remover `sourceNotes` e o código pode remover os campos escalares legados

#### Scenario: Rollback binário após contrato é proibido
- **WHEN** a coluna/contrato legado já foi removido
- **THEN** a operação usa forward-fix ou restauração controlada do backup, não uma aplicação antiga incompatível

### Requirement: Validação pós-deploy comprova preservação
O deploy MUST comparar preview e estado final para `TopFamilyMember` e `TopServant`, além de testar perfis com zero, um e vários serviços. Falha de contagem, perda de texto ou relação inválida MUST bloquear a conclusão do deploy.

#### Scenario: Histórico múltiplo validado
- **WHEN** o smoke test abre um Legendário com vários `TopServant`
- **THEN** todos os itens esperados aparecem e uma edição em um item não altera os outros

#### Scenario: Divergência de contagem
- **WHEN** a contagem ou os ids de `TopServant` diferem do preview sem operação de negócio explicável
- **THEN** o deploy não é declarado concluído e o rollback/forward-fix é acionado
