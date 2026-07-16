# password-self-service

## Purpose

Define o fluxo de redefinição de senha por link, no qual o administrador não vê nem define senha de terceiros e a própria pessoa troca a senha usando token seguro.

## Requirements

### Requirement: Admin não vê nem define senha
A edição administrativa de usuário NÃO SHALL conter campo de senha. O administrador NÃO SHALL conseguir, por nenhuma tela ou rota de API, ler ou definir a senha de outro usuário. Na tela de usuários o admin SHALL ver apenas dados básicos (ex.: nome, email).

#### Scenario: Sem campo de senha na edição
- **WHEN** o admin abre a edição de um usuário
- **THEN** não existe campo para definir/alterar senha

#### Scenario: API não permite admin definir senha de terceiro
- **WHEN** o admin chama diretamente a API tentando definir a senha de outro usuário
- **THEN** a operação é recusada

### Requirement: Redefinição de senha pelo dono via link
O sistema SHALL permitir que um admin (ou líder autorizado) gere um **link de redefinição** com token para um usuário. A **própria pessoa** SHALL abrir o link, ter o token validado e definir a nova senha. O token SHALL ser de uso único, com validade, e invalidado após o uso. Nenhuma rota de redefinição SHALL funcionar sem token válido.

#### Scenario: Redefinição com link válido
- **WHEN** o usuário abre um link de redefinição válido e define uma nova senha
- **THEN** a senha é atualizada e o token é invalidado

#### Scenario: Link expirado ou usado é recusado
- **WHEN** o usuário abre um link de redefinição expirado ou já utilizado
- **THEN** a redefinição é recusada

#### Scenario: Redefinição sem token é recusada
- **WHEN** alguém chama a rota de redefinição sem um token válido
- **THEN** a requisição é recusada

### Requirement: Anti-enumeração e auditoria da redefinição
O sistema NÃO SHALL revelar, em mensagens de erro, se um email/usuário existe. O sistema SHALL auditar a geração e o uso do link de redefinição, **sem** registrar senha nem token em log.

#### Scenario: Erro não vaza existência de usuário
- **WHEN** ocorre erro num fluxo de redefinição envolvendo um email/usuário
- **THEN** a mensagem não revela se o usuário existe

#### Scenario: Auditoria de redefinição
- **WHEN** um link de redefinição é gerado e usado
- **THEN** o sistema registra geração e uso, sem expor senha ou token
