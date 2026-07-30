## ADDED Requirements

### Requirement: Navegação primária usa permissions efetivas
A navegação SHALL ser construída a partir de um manifesto declarativo compartilhado de abas primárias. Telas concedíveis SHALL avaliar as permissions efetivas do `CurrentUser` e SHALL NOT usar papéis como gate de visibilidade. Exceções administrativas SHALL declarar explicitamente o papel exigido e SHALL permanecer fora do catálogo concedível. Cada item SHALL possuir `screenId`, rota e regra de entrada coerente com sua classificação.

#### Scenario: Permission mostra a aba
- **WHEN** um usuário possui a regra VIEW efetiva de uma tela primária
- **THEN** a aba correspondente aparece no Sidebar independentemente de sua Função na Manada

#### Scenario: Papel sem permission não mostra tela concedível
- **WHEN** um usuário possui um papel historicamente associado a uma tela concedível, mas não sua regra VIEW efetiva
- **THEN** a aba não aparece no Sidebar

#### Scenario: Estado do usuário ainda não carregou
- **WHEN** o Sidebar ainda não recebeu o `CurrentUser` ou a leitura da sessão falha
- **THEN** itens protegidos não são exibidos por padrão

#### Scenario: Exceção administrativa
- **WHEN** um usuário não possui o papel `COORDINATION_ADMIN`
- **THEN** a aba Usuários não aparece, mesmo se houver permission `users.read` ou `users.update` residual

### Requirement: Mapeamento das abas atuais é explícito e correto
O manifesto SHALL mapear Painel→`dashboard.read`, Legendários→`legendarios.read`, Equipes→`teams.read`, Líderes Espirituais→`spiritual-leaders.read`, Mapa→`map.read`, TOPs→`tops.read`, Ações Sociais→`social-actions.read`, Comunicação→`communications.read`, Relatórios→`reports.read` e Igrejas→`churches.read`. Usuários SHALL exigir o papel `COORDINATION_ADMIN` como exceção administrativa. Organograma SHALL usar o conjunto VIEW canônico após reconciliação com seu change proprietário. Nenhuma aba concedível SHALL usar permission de outro domínio como aproximação.

#### Scenario: Ações Sociais sem TOPs
- **WHEN** um usuário possui `social-actions.read` e não possui `tops.read`
- **THEN** Ações Sociais aparece e TOPs não aparece

#### Scenario: TOPs sem Ações Sociais
- **WHEN** um usuário possui `tops.read` e não possui `social-actions.read`
- **THEN** TOPs aparece e Ações Sociais não aparece

#### Scenario: Igrejas concedida a não-admin
- **WHEN** um não-admin recebe `churches.read`
- **THEN** Igrejas aparece sem exigir `COORDINATION_ADMIN`

#### Scenario: Usuários permanece admin-only
- **WHEN** um não-admin recebe `users.read` ou `users.update` residual
- **THEN** Usuários não aparece e sua API administrativa continua negada
- **AND** o usuário não consegue gerar link de redefinição de senha

#### Scenario: Administrador vê Usuários
- **WHEN** um `COORDINATION_ADMIN` autenticado abre a navegação
- **THEN** Usuários aparece pela regra administrativa, sem depender de entrada no catálogo concedível

#### Scenario: Líderes independente de Igrejas
- **WHEN** um usuário recebe `spiritual-leaders.read` e não `churches.read`
- **THEN** Líderes Espirituais aparece e Igrejas não aparece

#### Scenario: Painel sem permission
- **WHEN** um usuário não possui `dashboard.read`
- **THEN** Painel não aparece como aba navegável

### Requirement: Paridade entre manifesto e catálogo é verificável
O build/teste SHALL falhar se uma aba concedível apontar para `screenId` inexistente, se houver ID/rota duplicado ou se sua regra de entrada usar permission fora do conjunto VIEW canônico. Também SHALL falhar se uma exceção administrativa aparecer no catálogo concedível ou não declarar sua proteção por papel. O Sidebar SHALL consumir o manifesto em vez de reconstruir a lista de rotas protegidas manualmente.

#### Scenario: Nova rota sem tela de acesso
- **WHEN** uma nova aba é adicionada ao manifesto sem entrada correspondente no `SCREEN_CATALOG`
- **THEN** a verificação automatizada falha antes da entrega

#### Scenario: Permission de domínio errado
- **WHEN** uma aba declara uma permission que não pertence ao conjunto VIEW de seu `screenId`
- **THEN** a verificação automatizada falha

#### Scenario: Item duplicado
- **WHEN** duas entradas reutilizam o mesmo `screenId` ou a mesma rota primária
- **THEN** a verificação automatizada falha

#### Scenario: Usuários reaparece no catálogo
- **WHEN** `users` é incluído como tela concedível ou sua rota deixa de exigir `COORDINATION_ADMIN`
- **THEN** a verificação automatizada falha

### Requirement: Destino inicial respeita as telas concedidas
Após login e ao resolver a entrada `/dashboard`, o frontend SHALL escolher uma rota permitida a partir da mesma ordem do manifesto. `/dashboard` SHALL permanecer preferencial somente com `dashboard.read`. Sem ele, a primeira outra aba permitida SHALL ser usada. Sem qualquer aba primária permitida, o sistema SHALL exibir um estado terminal de acesso não configurado e SHALL NOT entrar em loop de redirects.

#### Scenario: Usuário possui Painel
- **WHEN** o login retorna um usuário com `dashboard.read`
- **THEN** o frontend navega para `/dashboard`

#### Scenario: Usuário sem Painel possui Líderes
- **WHEN** o login retorna um usuário sem `dashboard.read` e com `spiritual-leaders.read` como primeira tela permitida
- **THEN** o frontend navega para `/dashboard/lideres-espirituais`

#### Scenario: Entrada direta no Painel sem permission
- **WHEN** um usuário autenticado sem `dashboard.read` entra em `/dashboard`
- **THEN** é direcionado para a primeira rota primária permitida pelo manifesto

#### Scenario: Nenhuma tela concedida
- **WHEN** um usuário autenticado não possui nenhuma regra VIEW primária
- **THEN** vê “Acesso ainda não configurado” ou mensagem equivalente, sem erro de credencial e sem loop

### Requirement: Links cruzados respeitam acesso à tela de destino
Na tela Líderes Espirituais, links que abrem lista ou perfil de Legendários SHALL ser oferecidos somente quando `legendarios.read` estiver efetivo. A ausência do link SHALL NOT remover dados que pertencem legitimamente à view de Líderes Espirituais, e a API de Legendários SHALL continuar validando sua própria permission.

#### Scenario: Usuário também possui Legendários
- **WHEN** um usuário da view possui `legendarios.read`
- **THEN** “Ver legendários” e o link do legendário vinculado navegam para suas rotas atuais

#### Scenario: Usuário não possui Legendários
- **WHEN** um usuário da view não possui `legendarios.read`
- **THEN** a interface não oferece links para rotas de Legendários, mas continua exibindo os dados autorizados de líder/Igreja como texto

#### Scenario: URL direta de Legendários
- **WHEN** um usuário sem `legendarios.read` tenta abrir diretamente uma rota/API de Legendários
- **THEN** o backend nega a consulta independentemente de o link estar oculto

### Requirement: Ocultar menu não substitui autorização
O frontend SHALL tratar a visibilidade do menu e dos links como usabilidade. Toda API protegida SHALL continuar usando guards e permissions próprias; toda consulta escopada SHALL continuar aplicando o `AccessPolicyService`. Uma permission revogada SHALL ser negada na próxima requisição, ainda que uma interface já aberta mantenha estado visual obsoleto.

#### Scenario: Menu manipulado no navegador
- **WHEN** um usuário força a exibição de uma aba ou chama sua API manualmente sem permission
- **THEN** o backend responde 403

#### Scenario: Revogação durante sessão ativa
- **WHEN** um administrador revoga `spiritual-leaders.read` de um usuário já autenticado
- **THEN** a próxima chamada ao endpoint de Líderes Espirituais é negada sem exigir novo login
