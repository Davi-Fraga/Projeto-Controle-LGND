## ADDED Requirements

### Requirement: Sidebar mostra somente telas utilizáveis
A navegação primária MUST usar o manifesto compartilhado e o acesso efetivo do usuário. Uma tela permission-driven MUST aparecer somente quando estiver marcada como utilizável.

#### Scenario: Equipes concedida sem scope
- **GIVEN** um usuário com `teams.read` e `TEAM=MISSING` sem valor derivado
- **WHEN** o Sidebar é renderizado
- **THEN** a aba Equipes não aparece

#### Scenario: Equipes derivada
- **GIVEN** um coordenador com `teams.read` e Equipe efetiva derivada
- **WHEN** o Sidebar é renderizado
- **THEN** a aba Equipes aparece

#### Scenario: Tela global
- **GIVEN** um usuário com permission VIEW de uma tela global
- **WHEN** o Sidebar é renderizado
- **THEN** a aba aparece sem exigir scope

#### Scenario: Acesso ainda não carregado
- **WHEN** o contrato de acesso efetivo está ausente ou carregando
- **THEN** itens protegidos não são mostrados por padrão

### Requirement: Rotas diretas distinguem os motivos de bloqueio
O dashboard MUST aplicar um gate central às rotas primárias e suas subrotas, distinguindo permission ausente de escopo ausente.

#### Scenario: URL sem permission
- **GIVEN** um usuário autenticado sem a permission da tela
- **WHEN** ele abre diretamente sua URL
- **THEN** a interface mostra que ele não possui acesso
- **AND** não redireciona para login por esse motivo

#### Scenario: URL sem scope
- **GIVEN** um usuário com permission da tela e escopo satisfatório ausente
- **WHEN** ele abre diretamente sua URL
- **THEN** a interface informa que o acesso foi concedido, mas o escopo ainda não foi configurado

#### Scenario: Subrota proibida
- **GIVEN** uma rota de detalhe ou edição pertencente a uma tela não utilizável
- **WHEN** o usuário abre a subrota diretamente
- **THEN** o mesmo gate da rota primária bloqueia seu conteúdo

### Requirement: Destino inicial usa a primeira rota utilizável
Após autenticação e ao abrir `/dashboard`, o sistema MUST selecionar a primeira rota utilizável na ordem determinística do manifesto.

#### Scenario: Painel indisponível
- **GIVEN** um usuário sem Painel e com outra tela utilizável
- **WHEN** ele conclui o login
- **THEN** é direcionado à primeira outra rota utilizável

#### Scenario: Nenhuma rota utilizável
- **GIVEN** um usuário sem qualquer rota utilizável
- **WHEN** ele abre o dashboard
- **THEN** a interface mostra um estado terminal de acesso ainda não configurado
- **AND** não entra em loop de redirecionamento

### Requirement: Painel administrativo explica acesso incompleto
Uma tela concedida com `scopeMissing=true` MUST ser apresentada ao administrador como acesso ainda não efetivo e MUST indicar que a aba ficará escondida até existir dimensão satisfatória.

#### Scenario: Administrador vê configuração incompleta
- **GIVEN** uma tela em VIEW ou EDIT sem escopo satisfatório
- **WHEN** o administrador abre o Controle de Acessos
- **THEN** a linha mostra aviso e orientação para configurar scope
- **AND** nenhuma permission é revogada automaticamente
- **AND** nenhum scope `ALL` é concedido automaticamente

### Requirement: Navegação não substitui autorização
Esconder aba ou bloquear rota no web MUST NOT substituir guards de permission e scope na API.

#### Scenario: Requisição manual
- **GIVEN** uma aba escondida no web
- **WHEN** o usuário chama a API manualmente
- **THEN** o backend aplica sua própria permission e policy
