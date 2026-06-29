## Why

O sistema é interno e não pode ter um "cadastre-se" público aberto — mas o modelo atual, em que o admin cria conta a conta manualmente, não escala. É preciso permitir que Legendários obtenham acesso de forma **segura e controlada**, sem expor o cadastro a estranhos.

## What Changes

- Adiciona **acesso por convite via link**: um admin (ou líder autorizado) gera um **link único com token e validade**; só com esse link a pessoa cria a própria conta e define a própria senha. Sem convite válido, ninguém se cadastra.
- O convite pode já vir com **papel base e escopo** definidos por quem convida (ex.: Membro, ou Gestor de Cidade com escopo de Piracanjuba) — usando o mesmo modelo de `user-access-control` (02).
- O convite pode ser **vinculado a um `Legendary` existente** (dos 226 importados), para a conta nova já nascer associada ao cadastro da pessoa.
- **Fluxo**: tela "Convidar usuário" → define destinatário e opcionalmente papel/escopo/Legendary → sistema gera link com token → admin envia (ex.: WhatsApp) → pessoa abre, confirma dados e define senha → conta criada com papel/escopo do convite → token invalidado após uso.
- **Segurança**: token aleatório, único, longo, com validade, invalidado após uso ou expiração; nenhuma rota de cadastro funciona sem token válido; não expor se um email/dado existe (anti-enumeração); auditoria de geração e uso, sem logar senha.

## Capabilities

### New Capabilities
- `invite-link-onboarding`: criação de conta por convite — geração de link único com token/validade/papel/escopo/vínculo opcional com Legendary, página pública de aceite onde a pessoa define a própria senha, invalidação do token após uso/expiração e auditoria, sem qualquer cadastro público aberto.

### Modified Capabilities
<!-- Sem spec canônica de auth/cadastro em openspec/specs/. O fluxo de criação de conta é novo; o admin deixa de criar conta a conta manualmente. -->

## Impact

- **Affected specs**: nova capability `invite-link-onboarding`.
- **Affected code**:
  - Prisma: modelo de convite/token (token, validade, status, papel/escopo iniciais, vínculo opcional com `Legendary`, auditoria de geração/uso). Migration nova.
  - API: módulo de convites — gerar convite (admin/líder autorizado), validar token e criar conta na página de aceite, invalidar token; integração com o modelo de papel/escopo de `user-access-control`.
  - Web: tela **Convidar usuário** (gera link, define papel/escopo/Legendary) + **página pública de aceitar convite** (valida token, define senha).
- **Dependências**: usa o modelo de papel/escopo de `controle-acessos-por-usuario` (02). É **pré-requisito** de `redefinicao-senha-por-link` (08), que reaproveita o mecanismo de link/token.
- **Risco**: alto (auth/identidade). Token é credencial → tratar como segredo (não logar, invalidar, validade curta). Anti-enumeração obrigatório. Não alterar auth/CORS/refresh/Prisma bootstrap fora do aprovado.
