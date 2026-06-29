## 1. Inspeção e decisões

- [ ] 1.1 Inspecionar auth/users atuais e o modelo de papel/escopo de `user-access-control` (02)
- [ ] 1.2 Fechar decisões: validade do convite, quem pode convidar, token único genérico vs. tipado
- [ ] 1.3 Modelar convite/token; apresentar e aguardar aprovação

## 2. Modelo de dados

- [ ] 2.1 Migration: modelo de convite (hash do token, validade, status, papel/escopo, `legendaryId?`, auditoria)

## 3. Backend — convite

- [ ] 3.1 Endpoint de gerar convite (admin/líder autorizado) → link único com token
- [ ] 3.2 Endpoint público de aceitar convite: valida token (hash+validade+status), cria conta com papel/escopo, vincula Legendary, define senha, invalida token (transação)
- [ ] 3.3 Garantir que nenhuma rota de cadastro funcione sem token válido
- [ ] 3.4 Anti-enumeração nas respostas/erros + auditoria (sem logar senha/token)

## 4. Frontend

- [ ] 4.1 Tela "Convidar usuário" (gera link; define papel/escopo/Legendary opcionais)
- [ ] 4.2 Página pública de aceitar convite (valida token, pessoa define a senha)

## 5. Testes (segurança)

- [ ] 5.1 Convite válido cria conta com papel/escopo (e vínculo Legendary)
- [ ] 5.2 Convite expirado/usado recusado
- [ ] 5.3 Cadastro sem convite recusado
- [ ] 5.4 Auditoria de geração/uso registrada; nada de senha/token em log

## 6. Verificação

- [ ] 6.1 Testes focados (convites/auth)
- [ ] 6.2 `pnpm -r lint`, `pnpm -r test`, `pnpm -r build`; regenerar Prisma client (dev parado) após a migration
- [ ] 6.3 Conferência manual: gerar link, aceitar, conta nasce com papel/escopo e ligada ao Legendary; token vira inválido
