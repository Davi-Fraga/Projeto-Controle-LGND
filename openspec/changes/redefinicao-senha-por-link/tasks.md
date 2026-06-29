## 1. Pré-requisito e decisões

- [ ] 1.1 Confirmar que `convite-por-link-cadastro` (07) está implementada (mecanismo de link/token)
- [ ] 1.2 Decidir: reusar o token da 07 com `purpose` PASSWORD_RESET vs. modelo separado; validade; quem gera
- [ ] 1.3 Apresentar plano e aguardar aprovação

## 2. Backend — redefinição

- [ ] 2.1 Endpoint de gerar link de redefinição (admin/líder autorizado) → token
- [ ] 2.2 Endpoint público de redefinir: valida token (hash+validade+status), atualiza `passwordHash` (bcrypt), invalida token (transação)
- [ ] 2.3 Garantir que nenhuma rota de redefinição funcione sem token válido
- [ ] 2.4 Anti-enumeração + auditoria de geração/uso (sem logar senha nem token)

## 3. Remover controle de senha do admin (após o fluxo do dono existir)

- [ ] 3.1 Remover o campo **Nova senha** do `UpdateUserDto` e da edição administrativa
- [ ] 3.2 Garantir que o admin não consiga definir senha de terceiro por nenhuma via (DTO, service, API)

## 4. Frontend

- [ ] 4.1 Remover o campo de senha da edição de usuário; admin só vê nome/email
- [ ] 4.2 Ação **Gerar link de redefinição** na tela de usuário
- [ ] 4.3 Página pública de redefinição (valida token, pessoa define a senha)

## 5. Testes (segurança)

- [ ] 5.1 Link válido redefine a senha; token vira inválido
- [ ] 5.2 Link expirado/usado recusado; redefinição sem token recusada
- [ ] 5.3 Admin não consegue definir senha de terceiro por nenhuma via
- [ ] 5.4 Auditoria registrada; nada de senha/token em log; perfis/logins existentes seguem funcionando

## 6. Verificação

- [ ] 6.1 Testes focados (auth/senha)
- [ ] 6.2 `pnpm -r lint`, `pnpm -r test`, `pnpm -r build`; regenerar Prisma client (dev parado) se mudar schema
- [ ] 6.3 Conferência manual: gerar link, pessoa redefine, admin não vê senha em lugar nenhum
