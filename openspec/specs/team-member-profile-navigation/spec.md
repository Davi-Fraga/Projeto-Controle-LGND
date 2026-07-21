# team-member-profile-navigation Specification

## Purpose
TBD - created by archiving change navegacao-perfil-filtro-equipe-legendarios. Update Purpose after archive.
## Requirements
### Requirement: Membro da equipe abre o perfil existente
A lista Membros da Equipe SHALL oferecer, no nome do membro ou em uma ação equivalente e acessível, navegação para a rota existente `/dashboard/legendarios/:id`. A navegação SHALL preservar contexto suficiente para retornar à equipe de origem e NÃO SHALL criar uma tela de perfil paralela.

#### Scenario: Abrir perfil pelo nome
- **WHEN** o usuário ativa o nome de um membro na equipe que pode consultar
- **THEN** o sistema abre o perfil existente desse Legendário e oferece retorno à equipe de origem

#### Scenario: Navegação por teclado
- **WHEN** o usuário navega pela tabela usando teclado
- **THEN** o controle para abrir o perfil recebe foco e pode ser ativado pelo teclado

### Requirement: Leitura do perfil respeita equipe autorizada
`GET /legendarios/:id` SHALL aceitar leitura por usuário com `legendarios.read` conforme o escopo geográfico vigente OU por usuário com `teams.members.read` quando o Legendário possuir vínculo ativo e não excluído com uma equipe contida no escopo efetivo do usuário. A autorização SHALL ser verificada no backend e SHALL falhar de forma fechada para acesso direto fora do escopo.

#### Scenario: Gestor abre membro da própria equipe
- **WHEN** um gestor com `teams.members.read` solicita o perfil de um membro ativo de uma equipe em `scope.teamIds`
- **THEN** o backend retorna o perfil conforme a projeção de campos permitida ao usuário

#### Scenario: Membro de outra equipe não vaza
- **WHEN** o mesmo gestor solicita diretamente o perfil de um Legendário sem vínculo ativo com suas equipes autorizadas e fora do seu escopo geográfico
- **THEN** o backend não retorna o perfil nem revela se o Legendário existe

#### Scenario: Vínculo inativo não concede leitura
- **WHEN** o único vínculo do Legendário com a equipe autorizada está inativo ou excluído
- **THEN** esse vínculo não autoriza a leitura do perfil

### Requirement: Navegação não concede mutações nem histórico
O acesso ao perfil por equipe SHALL ser somente leitura. Editar cadastro, ler histórico e adicionar histórico SHALL continuar exigindo suas permissões próprias; a UI SHALL ocultar ações indisponíveis e o backend SHALL permanecer como barreira real.

#### Scenario: Gestor sem permissão de edição
- **WHEN** um gestor abre o perfil por possuir `teams.members.read`, mas não possui `legendarios.update`
- **THEN** a ação Editar Cadastro não é exibida e uma tentativa direta de mutação é negada

#### Scenario: Histórico sem permissão própria
- **WHEN** o gestor não possui `legendarios.history.read`
- **THEN** a tela não solicita nem exibe o histórico e o endpoint de histórico continua negando acesso
