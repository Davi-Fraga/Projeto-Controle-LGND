## ADDED Requirements

### Requirement: Vínculo opcional do líder espiritual a um Legendário

A Igreja SHALL aceitar um vínculo **opcional** do líder espiritual a um `Legendary` cadastrado (`spiritualLeaderLegendaryId`), coexistindo com o nome em texto livre existente. O vínculo SHALL ser opcional: uma igreja pode ter só texto livre, só vínculo, ou ambos. Vincular um legendário NÃO SHALL apagar o texto livre já gravado.

#### Scenario: Vincular um legendário

- **WHEN** o usuário seleciona um legendário no campo de líder espiritual e salva
- **THEN** a igreja passa a ter `spiritualLeaderLegendaryId` apontando para aquele legendário, e o texto livre anterior permanece gravado

#### Scenario: Manter texto livre (sem vínculo)

- **WHEN** o usuário digita um nome livre e não vincula nenhum legendário
- **THEN** a igreja é salva com o texto livre e sem vínculo, exatamente como hoje

#### Scenario: Desvincular restaura o texto livre

- **WHEN** uma igreja tem vínculo + texto livre e o usuário remove o vínculo
- **THEN** o vínculo fica nulo e o texto livre preservado volta a ser o nome exibido

### Requirement: Nome efetivo do líder espiritual (regra de coexistência)

O sistema SHALL derivar um **nome efetivo** do líder espiritual: quando houver `spiritualLeaderLegendaryId`, o nome efetivo SHALL ser o `fullName` do legendário vinculado; caso contrário, SHALL ser o `spiritualLeaderName` (texto livre). Quando ambos existirem, o **vínculo tem precedência** para exibição, e o texto livre permanece no banco.

#### Scenario: Vínculo tem precedência

- **WHEN** a igreja tem vínculo e texto livre diferentes
- **THEN** o nome exibido é o do legendário vinculado, não o texto livre

#### Scenario: Nome acompanha o cadastro do legendário

- **WHEN** o `fullName` do legendário vinculado é corrigido no cadastro
- **THEN** o nome efetivo do líder espiritual da igreja reflete a correção, sem editar a igreja

#### Scenario: Sem vínculo usa o texto livre

- **WHEN** a igreja não tem vínculo
- **THEN** o nome efetivo é o `spiritualLeaderName`

### Requirement: Validação e escopo do legendário vinculado

Ao gravar um `spiritualLeaderLegendaryId`, o backend SHALL validar que o legendário existe (não excluído) antes de persistir; um id inválido SHALL ser recusado com erro tratado. A seleção do legendário SHALL reusar o autocomplete/busca de legendário existente, respeitando o **escopo de acesso** do usuário — a busca NÃO SHALL revelar legendários fora do escopo. O backend SHALL ser a barreira real da validação, independentemente da UI.

#### Scenario: Legendário inexistente é recusado

- **WHEN** uma requisição tenta vincular um `spiritualLeaderLegendaryId` que não existe
- **THEN** o backend recusa com erro tratado e nada é gravado

#### Scenario: Busca escopada

- **WHEN** um usuário restrito busca um legendário para vincular
- **THEN** só aparecem legendários dentro do seu escopo

### Requirement: Preservação dos líderes já cadastrados (sem quebra)

A introdução do vínculo NÃO SHALL alterar as igrejas existentes: todas SHALL manter seu `spiritualLeaderName`/`spiritualLeaderPhone`/`spiritualLeaderUserId`, com o novo campo nascendo nulo. A migration SHALL ser aditiva e idempotente, sem perda de dados. O campo `spiritualLeaderUserId` (acesso) SHALL permanecer com o mesmo significado.

#### Scenario: Igrejas atuais intactas após a migration

- **WHEN** a migration do vínculo é aplicada
- **THEN** cada igreja existente mantém seu nome livre e demais campos, com `spiritualLeaderLegendaryId` nulo

#### Scenario: Vínculo não afeta o acesso

- **WHEN** uma igreja tem `spiritualLeaderUserId` (usuário com papel de líder espiritual)
- **THEN** esse acesso continua funcionando, independentemente de haver ou não vínculo de legendário

### Requirement: Auditoria da mudança de vínculo

Alterações no `spiritualLeaderLegendaryId` (vincular/trocar/desvincular) SHALL ser auditadas, no mesmo padrão já usado para o `spiritualLeaderUserId` (antes/depois, autor).

#### Scenario: Vincular é auditado

- **WHEN** o vínculo de líder espiritual é alterado ao salvar a igreja
- **THEN** a auditoria registra o valor anterior e o novo
