## ADDED Requirements

### Requirement: Substituição atômica por tipo
A API MUST permitir que um `COORDINATION_ADMIN` substitua a configuração de um
tipo de escopo em uma única operação atômica.

#### Scenario: Salvar vários selecionados
- **GIVEN** um administrador configurando o tipo `CHURCH`
- **WHEN** ele envia `mode=SELECTED` com vários IDs válidos e únicos
- **THEN** a API MUST substituir o conjunto anterior pelo conjunto enviado
- **AND** MUST retornar estado configurado e efetivo normalizado

#### Scenario: Salvar todos
- **WHEN** um administrador envia `mode=ALL` e `values=[]`
- **THEN** a API MUST remover valores explícitos do tipo
- **AND** MUST persistir uma política `ALL`

#### Scenario: Limpar escopo
- **WHEN** um administrador envia `mode=MISSING` e `values=[]`
- **THEN** a API MUST remover a política e todos os valores explícitos do tipo
- **AND** o acesso efetivo MUST depender apenas de eventuais vínculos derivados

#### Scenario: Falha não deixa estado parcial
- **GIVEN** um conjunto com ao menos um valor inválido
- **WHEN** a substituição é solicitada
- **THEN** a API MUST responder `400`
- **AND** MUST preservar integralmente o estado anterior
- **AND** MUST NOT registrar auditoria de sucesso

### Requirement: Validação integral do payload
O endpoint em lote MUST validar modo, tipo, cardinalidade, formato, unicidade e
existência antes de confirmar a mudança.

#### Scenario: Selected vazio é inválido
- **WHEN** o payload contém `mode=SELECTED` e `values=[]`
- **THEN** a API MUST responder `400`

#### Scenario: Missing ou All com valores é inválido
- **WHEN** o payload contém `mode=MISSING` ou `mode=ALL` com ao menos um valor
- **THEN** a API MUST responder `400`

#### Scenario: Valores duplicados
- **WHEN** o payload contém o mesmo UUID mais de uma vez
- **THEN** a API MUST rejeitar o payload com `400`
- **AND** MUST NOT persistir duplicatas

#### Scenario: Valor não pertence ao tipo
- **WHEN** um UUID existe, mas não representa uma entidade do tipo informado
- **THEN** a API MUST responder `400`
- **AND** o estado anterior MUST permanecer inalterado

#### Scenario: Limite de selecionados
- **WHEN** `SELECTED` contém mais de 500 valores
- **THEN** a API MUST responder `400` com mensagem que oriente reduzir a seleção ou usar `ALL`

### Requirement: Operação em lote é idempotente
Repetir uma solicitação já aplicada MUST preservar o mesmo estado sem criar
linhas ou políticas duplicadas.

#### Scenario: Repetição do mesmo conjunto
- **GIVEN** um conjunto `SELECTED` já persistido
- **WHEN** o mesmo payload normalizado é enviado novamente
- **THEN** a resposta MUST representar o mesmo estado
- **AND** o banco MUST continuar com uma única política e valores únicos

#### Scenario: Ordem diferente do mesmo conjunto
- **GIVEN** valores `A`, `B` e `C` já persistidos
- **WHEN** o cliente envia `C`, `A` e `B`
- **THEN** o sistema MUST tratar o conjunto como semanticamente igual

### Requirement: Endpoints unitários preservam invariantes
Enquanto os endpoints unitários existirem, eles MUST manter as mesmas
invariantes do contrato em lote e MUST NOT alterar silenciosamente uma dimensão
em `ALL`.

#### Scenario: Adição unitária em missing
- **GIVEN** uma dimensão configurada como `MISSING`
- **WHEN** um valor válido é adicionado pelo endpoint unitário
- **THEN** a dimensão MUST transitar para `SELECTED`

#### Scenario: Remoção do último selecionado
- **GIVEN** uma dimensão `SELECTED` com um único valor explícito
- **WHEN** esse valor é removido
- **THEN** a dimensão configurada MUST transitar para `MISSING`

#### Scenario: Operação unitária em all
- **GIVEN** uma dimensão configurada como `ALL`
- **WHEN** um cliente tenta adicionar ou remover um valor unitariamente
- **THEN** a API MUST responder `409 SCOPE_MODE_CONFLICT`
- **AND** MUST preservar `ALL`

### Requirement: Apenas administradores de coordenação gerenciam escopos
Leitura administrativa e mutação de escopos MUST permanecer protegidas por
`COORDINATION_ADMIN`, independentemente das permissões concedidas ao usuário.

#### Scenario: Membro chama o endpoint em lote
- **GIVEN** um usuário `MEMBER`, mesmo com alguma permissão `users.*`
- **WHEN** ele chama o endpoint de substituição de escopo
- **THEN** a API MUST responder `403`

#### Scenario: Administrador aplica configuração
- **GIVEN** um usuário `COORDINATION_ADMIN` autenticado
- **WHEN** ele envia uma configuração válida
- **THEN** a operação MUST ser autorizada

### Requirement: Auditoria registra uma alteração lógica
Cada substituição bem-sucedida MUST produzir auditoria única com responsável,
usuário afetado, tipo e estados normalizados anterior/posterior.

#### Scenario: Auditoria de selected para all
- **GIVEN** uma dimensão com valores selecionados
- **WHEN** o administrador a altera para `ALL`
- **THEN** MUST existir um evento `ACCESS_SCOPE_SELECTION_UPDATED`
- **AND** o evento MUST registrar o conjunto anterior e o modo posterior
- **AND** MUST NOT gerar um evento separado por valor removido

#### Scenario: Auditoria identifica o ator
- **WHEN** uma configuração é alterada com sucesso
- **THEN** o evento MUST identificar o administrador autenticado e o usuário afetado

### Requirement: Interface permite seleção múltipla preparada
A interface MUST permitir pesquisar, marcar e desmarcar múltiplos itens antes de
enviar uma única alteração.

#### Scenario: Selecionar vários resultados
- **GIVEN** o modo `Selecionados`
- **WHEN** o administrador marca vários itens, inclusive após novas buscas
- **THEN** todas as escolhas MUST permanecer no estado preparado
- **AND** o seletor MUST permanecer aberto após cada marcação
- **AND** nenhum request de mutação MUST ser enviado antes de “Aplicar”

#### Scenario: Aplicar seleção
- **WHEN** o administrador aciona “Aplicar”
- **THEN** a interface MUST enviar um único request com o conjunto completo do tipo
- **AND** MUST substituir o estado local pela resposta normalizada da API

#### Scenario: Cancelar edição
- **WHEN** o administrador aciona “Cancelar”
- **THEN** a interface MUST descartar as mudanças não aplicadas
- **AND** restaurar a configuração confirmada pela API

#### Scenario: Erro ao aplicar
- **WHEN** a API rejeita a atualização
- **THEN** a interface MUST manter o estado confirmado anterior
- **AND** MUST exibir erro acionável sem indicar sucesso parcial

### Requirement: Interface oferece Todos sem carregar todas as opções
Cada dimensão escopável MUST oferecer modo `Todos` com explicação de que novos
cadastros serão incluídos.

#### Scenario: Ativar todos
- **WHEN** o administrador escolhe “Todos”
- **THEN** a interface MUST exibir “inclui novos cadastros” ou mensagem equivalente
- **AND** MUST enviar `mode=ALL` com `values=[]`
- **AND** MUST NOT buscar todas as páginas do endpoint de opções

#### Scenario: Trocar de todos para selecionados
- **GIVEN** uma dimensão confirmada em `ALL`
- **WHEN** o administrador escolhe `Selecionados`
- **THEN** a interface MUST exigir ao menos uma seleção antes de aplicar
- **AND** MUST comunicar que o acesso deixará de incluir itens não selecionados

#### Scenario: Configurar todos os Legendários
- **WHEN** o administrador escolhe “Todas as cidades (todos os Legendários)”
- **THEN** a interface MUST persistir `CITY=ALL`
- **AND** MUST informar que o recorte geográfico também vale para outras telas já concedidas que usam Cidade

### Requirement: Interface distingue explícito de derivado
A interface MUST mostrar separadamente valores configuráveis e valores
provenientes do papel.

#### Scenario: Valor derivado visível
- **GIVEN** um usuário com equipe derivada de seu papel
- **WHEN** o administrador abre a dimensão Equipe
- **THEN** a equipe derivada MUST aparecer com indicação de origem
- **AND** MUST NOT oferecer remoção como se fosse um valor explícito

#### Scenario: Limpar explícitos preserva derivados
- **GIVEN** valores explícitos e derivados na mesma dimensão
- **WHEN** o administrador aplica `MISSING` para a configuração explícita
- **THEN** a interface MUST continuar mostrando os valores derivados retornados pela API
- **AND** MUST explicar por que o estado efetivo não está vazio

### Requirement: Catálogo informa dimensões satisfatórias
O catálogo compartilhado MUST diferenciar dimensões que satisfazem o escopo
principal da tela de dimensões suplementares.

#### Scenario: Legendários sinaliza falta geográfica
- **GIVEN** Legendários concedido, somente `TEAM` efetivo e nenhuma geografia efetiva
- **WHEN** o painel renderiza a tela
- **THEN** a tela MUST ser destacada com `scopeMissing=true`

#### Scenario: Papel satisfaz a tela
- **GIVEN** uma tela concedida e um vínculo de papel em uma dimensão satisfatória
- **WHEN** o painel renderiza a tela
- **THEN** `scopeMissing` MUST ser `false`

### Requirement: Fluxos críticos possuem cobertura automatizada e smoke
A mudança MUST ser validada por testes de backend, frontend e um smoke com
usuários reais antes do deploy.

#### Scenario: Matriz automatizada
- **WHEN** a suíte da mudança é executada
- **THEN** MUST cobrir `MISSING`, `SELECTED` e `ALL` para CITY, TEAM, CHURCH e TOP
- **AND** MUST cobrir entidade futura, composição derivada, transição de modos, IDOR, permissão ausente e auditoria

#### Scenario: Smoke com selecionados
- **GIVEN** um `MEMBER` com permissões de Legendários/Igrejas e valores selecionados
- **WHEN** ele usa Painel, listagens e detalhes
- **THEN** MUST ver exatamente os dados selecionados
- **AND** IDs fora do escopo MUST retornar `404`

#### Scenario: Smoke sem escopo
- **GIVEN** um `MEMBER` com telas concedidas e sem escopo efetivo
- **WHEN** ele usa Painel e listagens
- **THEN** contadores MUST ser omitidos/nulos e listagens MUST permanecer vazias
- **AND** o Controle de Acesso MUST sinalizar `scopeMissing`

#### Scenario: Smoke com todos
- **GIVEN** um `MEMBER` com as permissões necessárias e cada dimensão configurada como `ALL`
- **WHEN** ele usa os recursos correspondentes
- **THEN** MUST ver todos os dados dessas dimensões
- **AND** MUST continuar impedido de acessar `/access-control` ou gerar link de redefinição de senha
