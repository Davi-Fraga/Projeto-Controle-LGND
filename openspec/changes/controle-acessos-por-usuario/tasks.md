## 1. Inspeção e plano

- [ ] 1.1 Inspecionar `common/access` (`AccessPolicyService`), `PermissionsGuard`, `RolesGuard`, modelos RBAC no Prisma e o seed
- [ ] 1.2 Mapear telas → tipos de escopo aplicáveis (cidade/equipe/igreja)
- [ ] 1.3 Apresentar diffs/modelo de dados e aguardar aprovação antes de aplicar

## 2. Modelo de dados

- [ ] 2.1 Migration: override de permission por usuário (GRANT/REVOKE) e escopo por usuário (1-N, tipo + valor)
- [ ] 2.2 Atualizar seed idempotente se novas permissions forem necessárias

## 3. Backend — permissions efetivas e escopo

- [ ] 3.1 Calcular permissions efetivas (papel + concessões − revogações)
- [ ] 3.2 `PermissionsGuard` usa as efetivas, reavaliadas por requisição (revogação reflete sem relogar)
- [ ] 3.3 `AccessPolicyService` aplica o conjunto de escopos (cidade/equipe/igreja) em consultas e mutações
- [ ] 3.4 Validar combinação permission×escopo; recusar inválidas
- [ ] 3.5 Endpoints da tela de Controle de Acessos (ler/alterar overrides e escopos de um usuário)

## 4. Frontend — Controle de Acessos

- [ ] 4.1 Tela por usuário: lista permissions com origem (herdada/concedida/revogada) e toggle
- [ ] 4.2 Gestão de escopos (adicionar/remover, múltiplos)
- [ ] 4.3 Adaptar menus/navegação às permissions efetivas (sem ser barreira de segurança)

## 5. Testes (regra crítica)

- [ ] 5.1 Permissions efetivas seguem a fórmula; concessão e revogação individuais
- [ ] 5.2 403 logo após revogação em sessão ativa (sem relogar)
- [ ] 5.3 IDOR por URL direta e acesso fora do escopo por cidade negados
- [ ] 5.4 Usuário com múltiplos escopos vê os seus e não um terceiro
- [ ] 5.5 Revalidar login/acessos dos perfis existentes (sem regressão)

## 6. Verificação

- [ ] 6.1 Testes focados (access/guard/policy)
- [ ] 6.2 `pnpm -r lint`, `pnpm -r test`, `pnpm -r build`; regenerar Prisma client (dev parado) após a migration
- [ ] 6.3 Conferência manual: Gestor de Piracanjuba só vê Piracanjuba; revogação reflete sem relogar
