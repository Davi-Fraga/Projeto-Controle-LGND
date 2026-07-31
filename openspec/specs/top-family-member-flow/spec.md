# top-family-member-flow Specification

## Purpose
Fluxo de membros de Família no TOP: opções de participantes elegíveis buscadas no backend com escopo autoritativo, seleção por autocomplete canônico e observação em campo único, sem texto de origem paralelo.

## Requirements

### Requirement: Rótulo de Família é simplificado
O formulário, as mensagens de validação e o perfil do Legendário SHALL exibir **“Família”** no lugar de **“Família no primeiro TOP”**. A troca de rótulo NÃO SHALL alterar a relação entre `firstTopFamilyId` e `firstTopEventId`.

#### Scenario: Formulário exibe novo rótulo
- **WHEN** o usuário abre a seção Primeira Montanha do formulário de Legendário
- **THEN** o campo relacionado a `firstTopFamilyId` é identificado como “Família”

#### Scenario: Validação usa novo texto
- **WHEN** uma Família obrigatória não é informada para um primeiro TOP interno
- **THEN** a mensagem de validação se refere a “Família”, sem a frase antiga

#### Scenario: Perfil exibe novo rótulo
- **WHEN** o perfil mostra a Família ligada ao primeiro TOP
- **THEN** o rótulo apresentado é “Família” e o valor persistido permanece o mesmo

### Requirement: Seletores de pessoa reutilizam a fundação canônica
Toda seleção de pessoa alterada nesta entrega MUST reutilizar o `AsyncCombobox` da change `busca-reutilizavel-entidades-e-listagens`. Representante e sub-representante da Família SHALL usar o adaptador canônico de Legendário; membro da Família SHALL usar o mesmo componente com um adaptador para o endpoint existente de participantes do TOP. O sistema NÃO SHALL criar outro componente genérico de busca.

#### Scenario: Representante usa busca canônica de Legendário
- **WHEN** o usuário pesquisa um representante ou sub-representante da Família
- **THEN** o seletor usa o adaptador canônico de `GET /legendarios/options`, com rótulo e escopo definidos na change anterior

#### Scenario: Membro usa o mesmo componente visual
- **WHEN** o usuário pesquisa uma pessoa para adicionar à Família
- **THEN** a UI usa `AsyncCombobox` e injeta como fonte `GET /tops/:id/participants/options`

#### Scenario: Change anterior ainda não está disponível
- **WHEN** a implementação desta change é iniciada sem a fundação de busca anterior aplicada
- **THEN** a tarefa permanece bloqueada e nenhuma cópia local do combobox é criada

### Requirement: Candidato a membro deve ter subido no TOP atual
O backend MUST considerar elegível somente `TopParticipant` cujo `topEventId` seja o TOP da rota, `deletedAt` seja nulo e `status` seja diferente de `CANCELLED`. `TopServant` e Legendário sem participação nesse TOP NÃO SHALL aparecer nem ser aceitos como membro.

#### Scenario: Participante do TOP aparece
- **WHEN** um Legendário possui participação não cancelada e não excluída no TOP atual
- **THEN** seu `TopParticipant` pode aparecer nas opções de membro

#### Scenario: Participante de outro TOP não aparece
- **WHEN** a mesma pessoa possui participação apenas em outro TOP
- **THEN** ela não aparece nas opções do TOP atual

#### Scenario: Servo não equivale a participante
- **WHEN** a pessoa possui somente `TopServant` no TOP atual
- **THEN** ela não aparece como candidato a membro de Família

#### Scenario: Participação cancelada não aparece
- **WHEN** o `TopParticipant` está cancelado ou excluído
- **THEN** ele não aparece e o backend rejeita seu id em uma inclusão manual

### Requirement: Participante já ligado a Família ativa não é elegível
No contexto de inclusão em Família, o endpoint SHALL omitir `TopParticipant` que já possua `TopFamilyMember` ativo e não excluído no mesmo TOP. A mutation MUST repetir essa validação para impedir condição de corrida ou requisição manual.

#### Scenario: Participante livre aparece
- **WHEN** o participante não pertence a nenhuma Família ativa do TOP
- **THEN** ele pode ser retornado pelo autocomplete

#### Scenario: Participante já vinculado é omitido
- **WHEN** o participante já pertence a uma Família ativa do mesmo TOP
- **THEN** ele não aparece nas opções para outra Família

#### Scenario: Duas inclusões concorrentes
- **WHEN** duas requisições tentam vincular o mesmo participante antes de a UI atualizar
- **THEN** no máximo uma inclusão é aceita e a outra recebe erro de negócio

### Requirement: Busca de participantes é limitada e normalizada
`GET /tops/:id/participants/options` SHALL aceitar `search`, `limit` e um contexto explícito de disponibilidade para Família. A busca MUST normalizar o termo como a busca canônica de Legendários e aplicá-lo em `legendary.searchText` antes do limite. O payload SHALL continuar enxuto, com `value = TopParticipant.id` e metadata de desambiguação.

#### Scenario: Busca sem acento encontra participante
- **WHEN** o usuário digita `joao` e existe `João` elegível no TOP
- **THEN** o participante aparece nos resultados

#### Scenario: Número LGND desambigua
- **WHEN** o termo corresponde ao número LGND contido em `searchText`
- **THEN** o participante correspondente aparece com nome, cidade e número disponíveis no item

#### Scenario: Resultado é limitado
- **WHEN** muitos participantes elegíveis correspondem ao termo
- **THEN** o endpoint retorna no máximo o limite solicitado/permitido e não carrega todos os participantes

#### Scenario: Valor persistido é TopParticipant
- **WHEN** o usuário escolhe uma opção e envia a inclusão
- **THEN** o payload contém `topParticipantId`, não um `legendaryId` convertido no frontend

### Requirement: Escopo e permissões são preservados
A consulta de opções MUST permanecer protegida por JWT, `tops.participants.read` e `TopScopeGuard`. O guard MUST resolver `AccessPolicyService` e negar TOP fora de `scope.topIds`. A inclusão MUST continuar exigindo `tops.families.members.add`. A busca NÃO SHALL revelar existência, nomes ou metadata de participantes de TOP fora do escopo.

#### Scenario: TOP dentro do escopo
- **WHEN** o usuário possui a permissão de leitura e o TOP está em seu escopo
- **THEN** ele pode pesquisar participantes elegíveis daquele TOP

#### Scenario: TOP fora do escopo
- **WHEN** o usuário altera manualmente o id da rota para um TOP fora de seu escopo
- **THEN** a requisição é negada antes de retornar opções

#### Scenario: Usuário somente com escopo de TOP
- **WHEN** o usuário possui `topIds` autorizados, mas não possui escopo geográfico de Igreja/cidade
- **THEN** os participantes do TOP autorizado continuam pesquisáveis pelo sub-recurso

#### Scenario: Leitura não concede inclusão
- **WHEN** o usuário pode pesquisar participantes mas não possui `tops.families.members.add`
- **THEN** ele não consegue criar o vínculo de Família

### Requirement: Autocomplete preserva estados e respostas atuais
O seletor de membro SHALL herdar debounce, proteção anti-race, navegação por teclado, estados de carregamento/vazio/erro e preservação de rótulo da fundação canônica. Após inclusão bem-sucedida, SHALL limpar a seleção e atualizar as opções; após falha, SHALL preservar contexto suficiente para correção.

#### Scenario: Resposta antiga não sobrescreve termo atual
- **WHEN** uma busca anterior termina depois de uma busca mais recente
- **THEN** somente o resultado mais recente é exibido

#### Scenario: Inclusão bem-sucedida remove candidato
- **WHEN** o participante é adicionado à Família
- **THEN** a seleção é limpa e ele deixa de aparecer como disponível

#### Scenario: Erro de elegibilidade
- **WHEN** o participante deixa de ser elegível antes do submit
- **THEN** a UI apresenta o erro de negócio e recarrega as opções sem transformar a falha em lista vazia

### Requirement: Vínculo de Família possui uma observação geral
Novos e atualizados `TopFamilyMember` SHALL expor somente `notes` como observação geral. O formulário de inclusão SHALL mostrar um único campo “Observações”, iniciado vazio e novamente esvaziado após sucesso. `sourceNotes` NÃO SHALL fazer parte do novo contrato web/API.

#### Scenario: Novo formulário começa vazio
- **WHEN** o formulário para adicionar membro é aberto ou resetado após sucesso
- **THEN** o campo Observações contém string vazia e nenhum texto é pré-preenchido

#### Scenario: Observação opcional é salva
- **WHEN** o usuário informa uma observação geral
- **THEN** o texto aparado é persistido em `TopFamilyMember.notes`

#### Scenario: Inclusão sem observação
- **WHEN** o usuário deixa o campo vazio
- **THEN** o vínculo é criado com `notes = null`

### Requirement: Observações históricas são consolidadas sem perda
A migração MUST preservar integralmente conteúdo não vazio de `notes` e `sourceNotes`. Valores duplicados após trim SHALL aparecer uma vez; valores diferentes SHALL ser concatenados em `notes` com duas quebras de linha, sem prefixos inventados. A remoção física de `sourceNotes` MUST ocorrer somente em fase posterior e aprovada.

#### Scenario: Somente observação original existe
- **WHEN** um vínculo possui `sourceNotes` e `notes` vazio
- **THEN** o texto original é copiado para `notes`

#### Scenario: Duas observações diferentes existem
- **WHEN** ambos os campos têm textos diferentes
- **THEN** os dois textos permanecem em `notes`, na ordem vínculo e original, separados por duas quebras de linha

#### Scenario: Textos iguais não duplicam
- **WHEN** os campos são iguais após trim
- **THEN** `notes` mantém uma única cópia

#### Scenario: Contagem de vínculos é preservada
- **WHEN** a migração de observações termina
- **THEN** nenhum `TopFamilyMember` foi criado, excluído ou teve suas relações/status alterados
