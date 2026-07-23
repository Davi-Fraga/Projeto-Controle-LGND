## ADDED Requirements

### Requirement: Geração de reset exige papel administrativo
Gerar link de redefinição de senha para outro usuário MUST exigir autenticação e o papel `COORDINATION_ADMIN`. Permissions residuais `users.read` ou `users.update` MUST NOT satisfazer essa autorização.

#### Scenario: Administrador gera link
- **GIVEN** um usuário autenticado com papel `COORDINATION_ADMIN`
- **WHEN** ele solicita um link de redefinição para um usuário existente
- **THEN** o link é criado e a operação é auditada

#### Scenario: Permission residual não eleva privilégio
- **GIVEN** um usuário não administrador com `users.update` residual
- **WHEN** ele solicita um link de redefinição para outro usuário
- **THEN** a API retorna `403`
- **AND** nenhum token é criado

### Requirement: Uso público do token permanece separado
Validar e consumir um token de redefinição MUST permanecer disponível sem JWT e MUST continuar protegido pelas regras de validade, uso único e rate limit existentes.

#### Scenario: Token válido
- **GIVEN** um token válido e ainda não utilizado
- **WHEN** o titular valida e consome o token
- **THEN** a senha é redefinida segundo o contrato existente

#### Scenario: Token inválido ou consumido
- **WHEN** um token inexistente, expirado ou já utilizado é apresentado
- **THEN** a API retorna a resposta genérica segura existente
