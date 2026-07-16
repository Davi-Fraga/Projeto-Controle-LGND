# invite-link-onboarding

## Purpose

Define o fluxo de criação de contas por convite, sem cadastro público aberto, com token seguro de uso único, papel/escopo inicial e auditoria.

## Requirements

### Requirement: Acesso somente por convite
O sistema NÃO SHALL oferecer cadastro público aberto. A criação de conta SHALL ocorrer exclusivamente por um convite com token válido. Nenhuma rota de cadastro SHALL funcionar sem um token de convite válido.

#### Scenario: Cadastro sem convite é recusado
- **WHEN** alguém tenta criar conta sem um token de convite válido
- **THEN** a requisição é recusada

#### Scenario: Cadastro com convite válido
- **WHEN** a pessoa abre um link de convite válido e define sua senha
- **THEN** a conta é criada

### Requirement: Geração de convite com papel/escopo e vínculo opcional
Um admin (ou líder autorizado) SHALL poder gerar um convite que produz um **link único** com token e validade. O convite SHALL poder definir papel base e escopo iniciais (usando o modelo de `user-access-control`) e SHALL poder ser vinculado a um `Legendary` existente para a conta nascer associada ao cadastro.

#### Scenario: Convite com papel e escopo
- **WHEN** o admin gera um convite com papel "Gestor de Cidade" e escopo "Piracanjuba"
- **THEN** a conta criada por esse convite nasce com esse papel e escopo

#### Scenario: Convite vinculado a Legendary
- **WHEN** o convite é vinculado a um `Legendary` existente
- **THEN** a conta criada fica associada a esse `Legendary`

### Requirement: Token de convite seguro e de uso único
O token de convite SHALL ser aleatório, único e suficientemente longo, com **validade** definida, e SHALL ser invalidado após o uso ou a expiração. O sistema NÃO SHALL aceitar um token expirado ou já utilizado.

#### Scenario: Token usado é invalidado
- **WHEN** um convite é usado para criar a conta
- **THEN** o token correspondente é invalidado e não pode ser reutilizado

#### Scenario: Token expirado é recusado
- **WHEN** alguém abre um link de convite cujo token expirou
- **THEN** o cadastro é recusado

### Requirement: Anti-enumeração e auditoria
O sistema NÃO SHALL revelar, em respostas ou mensagens de erro, se um email/dado existe (evitar enumeração). O sistema SHALL registrar auditoria de geração e uso de convites (quem gerou, para quem, quando, quando foi usado) **sem** registrar senha em log.

#### Scenario: Erro não vaza existência
- **WHEN** ocorre erro num fluxo que envolve um email/dado
- **THEN** a mensagem não revela se o email/dado existe no sistema

#### Scenario: Auditoria de convite
- **WHEN** um convite é gerado e depois usado
- **THEN** o sistema registra a geração e o uso, sem expor senha
