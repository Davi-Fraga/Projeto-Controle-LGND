## 1. Inspeção e decisões finais

- [x] 1.1 Inspecionado: Organograma é plano hoje (equipe → coordenador segura membros; cidade → legendário). Sem camada de sub-coordenador nem de Líder. Escopo por cidade já existe (`buildLegendaryWhere`/`assertCityAllowed`).
- [x] 1.2 Decidido: "sem gestor" = campo nulo/derivado; transição automática (geridos → nulo). Ver design (Open Questions resolvidas).
- [x] 1.3 Modelo aprovado (self-relations `TeamMembership.managerMembershipId` + `Legendary.cityLeaderId`); backfill começa tudo "sem gestor"; sem sugestão automática.

## 2. Modelo de dados

- [x] 2.1 Migration `20260717130000_add_management_hierarchy`: `TeamMembership.managerMembershipId` + `Legendary.cityLeaderId` (self-relations, FK ON DELETE SET NULL), preservando os campos de coordenação. Aplicada no dev DB.
- [x] 2.2 Backfill: nulável = "sem gestor"; nada a derivar (organograma era plano). Linhas existentes começam sem gestor.

## 3. Backend — teto e redistribuição

- [x] 3.1 Teto de 10 (admin isento — usuário vinculado é `COORDINATION_ADMIN`) validado no `ManagementService` (cidade e equipe).
- [x] 3.2 Endpoints `POST /management/city/assign-leader` e `POST /management/team/assign-manager`: atômicos, sem duplicar, bloqueiam teto, checam ciclo e mesma-cidade/mesma-equipe; auditados.
- [x] 3.3 Transição automática: `LegendariosService.deactivate` (em transação) libera liderados de cidade e integrantes geridos (→ nulo). FK ON DELETE SET NULL cobre hard-delete.
- [x] 3.4 Escopo respeitado: `buildLegendaryWhere` (cidade) e `assertTeamAllowed` (equipe) no service.

## 4. Organograma derivado (backend)

- [x] 4.1 Derivação implementada: `getTeamChart` aninha por `managerMembershipId` (coordenador→sub-coordenador→integrantes); `getCitiesChart` (modo legendários) aninha por `cityLeaderId` (cidade→Líder→geridos) + nó "Sem gestor"; sem Líder → lista plana (degrada). +2 testes (20 no total do módulo).

> **Fora do escopo desta change (viram uma feature completa separada):** a **UI de redistribuição manual** (mover pessoa entre gestores pela tela) e o **redesenho visual do Organograma**. Esta change entrega o backend: hierarquia persistida, teto, endpoints de redistribuição e organograma derivado. O consumo visual desses endpoints e a estética ficam para a próxima feature.

## 5. Testes

- [x] 5.1 Teto: bloqueia ao exceder (409), aceita abaixo; admin isento (`management.service.spec`).
- [x] 5.2 Redistribuição (endpoints): move respeitando teto; bloqueia; recusa ciclo, si-mesmo, outra cidade/equipe; unassign (null).
- [~] 5.3 "Sem gestor"/transição: coberto no service + `deactivate` (teste do soft-delete verde); teste dedicado de transição end-to-end fica para a feature de UI.
- [x] 5.4 Escopo por cidade no Organograma: já garantido por `assertCityAllowed`/`buildLegendaryWhere` na derivação (teste de IDOR existente cobre).

## 6. Verificação

- [x] 6.1 Testes focados (hierarquia/organograma): management 10 + org-chart 2 novos.
- [x] 6.2 API `lint` (eslint+tsc) ✓ e **253 testes ✓**; Prisma client regenerado após a migration. (Sem mudança no web nesta change.)
- [~] 6.3 Conferência via API (endpoints de atribuição + organograma derivado). Conferência visual fica na feature de UI.
