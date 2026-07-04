## Decisões fechadas (1.2)
- Quem convida: **só Administrador** (`users.create`).
- Validade: **7 dias, uso único**.
- Token: **genérico tipado** (`AuthToken.type` = INVITE | PASSWORD_RESET) — a 08 reaproveita.
- No aceite: a pessoa define **nome + senha**; email + função + escopo + Legendário vêm do convite.
- O convite carrega **função + Legendário + escopos**; o **acesso a telas** é configurado depois em Controle de Acessos (formulário de convite enxuto). Escopos suportados via API/metadata.

## 1. Inspeção e decisões
- [x] 1.1 Inspecionar auth/users e o modelo de papel/escopo de `user-access-control` (02)
- [x] 1.2 Fechar decisões (acima)
- [x] 1.3 Modelar convite/token; aprovado

## 2. Modelo de dados
- [x] 2.1 Migration `20260704120000_auth_token_invite`: `AuthToken` (hash, validade, status, roles, `legendaryId?`, metadata/escopos, auditoria)

## 3. Backend — convite
- [x] 3.1 `POST /auth/invites` (admin, `users.create`) → link único (token cru só no link; hash no banco)
- [x] 3.2 `POST /auth/invites/:token/accept` (público): valida token, cria conta com função/escopo, vincula Legendary, define senha, invalida token — em transação
- [x] 3.3 Sem token válido não cria conta (findValidInvite recusa; `POST /users` segue admin-only)
- [x] 3.4 Anti-enumeração (erro genérico "Convite inválido ou expirado") + auditoria de geração/uso (sem senha/token)

## 4. Frontend
- [x] 4.1 Tela "Convidar usuário" (`/dashboard/usuarios/convidar`): email + função + Legendário → gera e copia o link
- [x] 4.2 Página pública `/convite/[token]`: valida token, pessoa define nome + senha

## 5. Testes (segurança)
- [x] 5.1 Convite válido cria conta com função/escopo (e vínculo Legendary) — unit + smoke
- [x] 5.2 Convite expirado/usado/outro tipo recusado
- [x] 5.3 Cadastro sem convite recusado (token inválido → 404, sem transação)
- [x] 5.4 Auditoria de geração/uso; hash no banco, nunca o token cru

## 6. Verificação
- [x] 6.1 Testes focados (9 de invites; 158 total)
- [x] 6.2 `pnpm -r lint` ✓, API tests ✓ (158), Prisma client regenerado (dev parado). `web build` standalone segue com EPERM de symlink (ambiente).
- [x] 6.3 Smoke live: gerar link → validar → aceitar → login (funções ok, 0 perms = acesso via Controle de Acessos) → token vira inválido (uso único).
