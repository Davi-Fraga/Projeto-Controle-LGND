## Why

Hoje a tela de editar usuário tem o campo **Nova senha**, ou seja, o admin pode trocar a senha de qualquer pessoa. Num sistema interno com vários usuários, a senha deve ser responsabilidade do dono da conta, não do administrador operacional. O admin não deveria ver nem definir a senha de ninguém.

## What Changes

- **Remove o campo "Nova senha"** da edição administrativa de usuário. O admin passa a só visualizar dados básicos (nome, email) — **não vê nem altera senha** em nenhum ponto do sistema.
- Adiciona a ação **"Gerar link de redefinição de senha"** para um usuário: o admin (ou líder autorizado) gera um link com token, envia à pessoa (ex.: WhatsApp), e **a própria pessoa** abre o link, valida o token e define a nova senha.
- **Reaproveita o mecanismo de link/token** da feature `convite-por-link-cadastro` (07): token aleatório, único, com validade, invalidado após o uso. Não exige servidor de email.
- **Ordem de segurança**: só remover o controle de senha do admin **depois** que o fluxo de redefinição pelo próprio usuário estiver funcionando (senão alguém pode ficar sem acesso).
- **Segurança**: nenhuma rota de redefinição funciona sem token válido; anti-enumeração (não revelar se um email/usuário existe); auditoria de geração e uso do link, sem registrar senha nem token em log.

## Capabilities

### New Capabilities
- `password-self-service`: o dono da conta redefine a própria senha por link com token (gerado por admin/líder), o admin nunca lê nem define senha de ninguém, e o campo de senha some da edição administrativa de usuário.

### Modified Capabilities
<!-- A tela administrativa de usuário (sem spec canônica própria) perde o campo de senha; descrito como requisito da nova capability. -->

## Impact

- **Affected specs**: nova capability `password-self-service`.
- **Affected code**:
  - API: módulo de auth/users — endpoint de gerar link de redefinição (admin/líder), endpoint público de redefinir senha validando token; reuso do modelo de token de `invite-link-onboarding` (07). Remover qualquer caminho de o admin definir senha de terceiros.
  - Web: remover o campo **Nova senha** da edição de usuário; adicionar ação **Gerar link de redefinição**; criar a página pública de redefinição (valida token, define senha).
- **Dependências**: **depende de `convite-por-link-cadastro` (07)** — usa o mesmo mecanismo de link/token. Implementar **depois** da 07.
- **Risco**: alto (auth/senha). Não inverter a ordem (remover senha do admin só após o fluxo do dono existir). Token é credencial (não logar, invalidar, validade). Anti-enumeração. Não alterar auth/CORS/refresh/Prisma bootstrap fora do aprovado.
