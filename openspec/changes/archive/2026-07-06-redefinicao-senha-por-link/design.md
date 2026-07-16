## Context

Hoje o admin pode trocar a senha de qualquer um (campo "Nova senha" na edição de usuário). Senha deve ser responsabilidade do dono. A abordagem foi decidida: **redefinição por link**, reusando o mecanismo de token de `convite-por-link-cadastro` (07). Sem servidor de email — o admin gera e envia o link. Depende da 07 estar implementada.

## Goals / Non-Goals

**Goals**
- Remover o campo de senha da edição administrativa; admin nunca lê/define senha.
- Redefinição pelo próprio dono via link com token (uso único, validade).
- Reuso do mecanismo de token da 07; anti-enumeração e auditoria.

**Non-Goals**
- Não construir infra de email (admin copia o link; email é evolução).
- Não reimplementar o token do zero — reaproveitar o de `invite-link-onboarding` (07).
- Não tratar papéis/escopo (é `user-access-control`/02; esta nota foca só em senha).

## Decisions

### Reuso do token da 07
Usar o mesmo modelo de token/link da 07, com um tipo `PASSWORD_RESET` (ou modelo genérico com `purpose`). Token: hash no banco, aleatório, validade, uso único. Mantém uma só implementação de token/link no sistema.

### Geração e página de redefinição
Endpoint de "gerar link de redefinição" (admin/líder autorizado) → link com token. Página pública (sem JWT, com `RateLimitGuard`) que valida token (hash+validade+status) e deixa a pessoa definir a nova senha; ao concluir, atualiza o `passwordHash` (bcrypt, como no resto) e invalida o token, em transação. Erros genéricos (anti-enumeração).

### Remoção do controle de senha do admin (ordem)
Remover o campo "Nova senha" do `UpdateUserDto`/tela e qualquer caminho de o admin setar senha de terceiro — **somente depois** que o fluxo do dono estiver funcionando. Confirmar que o admin não consegue definir senha por nenhuma via (DTO, service, API).

## Risks / Trade-offs

- **Ordem invertida = lockout**: se remover a senha do admin antes do fluxo do dono existir, alguém pode ficar sem acesso → gate explícito: 07 pronta + fluxo de redefinição validado antes da remoção.
- **Token é credencial**: hash, validade, uso único, nunca logar.
- **Enumeração**: respostas genéricas.
- **Decisão de token compartilhado vs. tipado**: alinhar com a 07 para não divergir.

## Migration Plan

Se a 07 já cobre o modelo de token, esta feature pode só adicionar o tipo/purpose `PASSWORD_RESET` (migration pequena) ou reusar direto. Implementar atrás de testes: link válido redefine; expirado/usado recusado; admin sem conseguir definir senha por nenhuma via. Regenerar Prisma client (dev parado) se houver mudança de schema.

## Open Questions

- Validade do link de redefinição (7 dias?) e comportamento ao expirar.
- Quem pode gerar o link: só admin, ou líderes/gestores autorizados?
- Reusar o mesmo modelo de token da 07 com `purpose`, ou um modelo separado para redefinição?
- Confirmar que não há nenhum outro caminho (seed, script, endpoint) onde o admin define senha de terceiros.
