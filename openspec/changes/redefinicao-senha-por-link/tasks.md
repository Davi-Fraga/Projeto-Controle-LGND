## Decisões fechadas (1.2)
- Reusa o `AuthToken` da 07 com `type=PASSWORD_RESET` + `userId` (sem migration nova).
- Validade: **24h, uso único** (credencial sensível; mais curto que o convite).
- Quem gera: **só Administrador** (`users.update`).
- **Só por convite**: o admin não define senha em ponto nenhum — removido do criar (rota `POST /users` e a página "Novo Usuário") **e** do editar.
- Ao redefinir: além de trocar a senha, **revoga as sessões (refresh tokens)** do usuário.

## 1. Pré-requisito e decisões
- [x] 1.1 07 (convite) implementada — `AuthToken` disponível
- [x] 1.2 Decisões fechadas (acima)
- [x] 1.3 Plano aprovado

## 2. Backend — redefinição
- [x] 2.1 `POST /auth/password-reset` (admin, `users.update`) → link (token cru só no link; hash no banco)
- [x] 2.2 `POST /auth/password-reset/:token/reset` (público): valida token, atualiza `passwordHash` (bcrypt), revoga refresh tokens, invalida token — em transação
- [x] 2.3 Sem token válido não redefine (findValidReset recusa)
- [x] 2.4 Anti-enumeração (erro genérico) + auditoria de geração/uso (sem senha/token)

## 3. Remover controle de senha do admin (após o fluxo do dono existir)
- [x] 3.1 Removido `password` do `UserDataDto`/`UpdateUserDto` e da edição
- [x] 3.2 Admin não define senha por nenhuma via: `POST /users` removido; `UsersService.create` removido; `update` sem senha; PATCH com `password` → 400 (whitelist)

## 4. Frontend
- [x] 4.1 Página pública `/redefinir-senha/[token]`: valida token, pessoa define a nova senha
- [x] 4.2 Ação **"Redefinir senha"** na lista de usuários → gera e copia o link
- [x] 4.3 Removido o campo de senha do form + página "Novo Usuário" + botão (fica só "Convidar")

## 5. Testes (segurança)
- [x] 5.1 Link válido redefine; token vira inválido (unit + smoke)
- [x] 5.2 Link expirado/usado/tipo errado recusado; sem token recusado
- [x] 5.3 Admin não define senha de terceiro por nenhuma via (POST 404, PATCH 400)
- [x] 5.4 Auditoria de geração/uso; hash no banco, nunca o cru; sessões revogadas no reset

## 6. Verificação
- [x] 6.1 Testes focados (6 de password-reset; 164 total)
- [x] 6.2 `pnpm -r lint` ✓, API tests ✓ (164), sem migration (reusa AuthToken)
- [x] 6.3 Smoke live: gerar → validar → redefinir → login senha nova ok, senha antiga negada (401) → token uso único (404); admin sem definir senha (POST 404 / PATCH 400)
