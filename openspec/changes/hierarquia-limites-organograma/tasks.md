## 1. Inspeção e decisões finais

- [ ] 1.1 Inspecionar schema atual (Team, TeamMembership, Legendary, `coordinatorLegendaryId`/`deputyCoordinatorLegendaryId`) e os services/Organograma
- [ ] 1.2 Fechar as 2 decisões abertas: estado "sem gestor" e transições (saída/troca de gestor)
- [ ] 1.3 Definir modelo dos vínculos de gestão + estratégia de backfill; apresentar e aguardar aprovação

## 2. Modelo de dados

- [ ] 2.1 Migration: vínculos Sub-coordenador→Integrantes e Líder→Legendários, preservando os campos de coordenação atuais
- [ ] 2.2 Backfill conservador (derivar vínculos existentes quando possível; senão "sem gestor")

## 3. Backend — teto e redistribuição

- [ ] 3.1 Validar teto de 10 por gestor (admin isento) em create/update/atribuição/listagem
- [ ] 3.2 Endpoint de redistribuição manual (mover pessoa entre gestores), atômico, sem duplicar, bloqueando violação do teto
- [ ] 3.3 Tratar estado "sem gestor" e transições (saída/troca → geridos voltam para "sem gestor")
- [ ] 3.4 Respeitar escopo por cidade do Gestor de Cidade (depende de `user-access-control`)

## 4. Organograma derivado

- [ ] 4.1 Derivar a árvore dos vínculos persistidos
- [ ] 4.2 UI de redistribuição manual (mover pessoa entre gestores) respeitando o teto

## 5. Testes

- [ ] 5.1 Teto: bloqueia ao exceder, aceita abaixo; cidade 23 → ≥3 Líderes (10+10+3)
- [ ] 5.2 Redistribuição: move respeitando teto; bloqueia ao violar; sem vínculo duplicado/inconsistente
- [ ] 5.3 "Sem gestor": cadastro não trava; saída de gestor libera geridos
- [ ] 5.4 Escopo por cidade no Organograma (Gestor de Cidade)

## 6. Verificação

- [ ] 6.1 Testes focados (hierarquia/organograma)
- [ ] 6.2 `pnpm -r lint`, `pnpm -r test`, `pnpm -r build`; regenerar Prisma client (dev parado) após a migration
- [ ] 6.3 Conferência manual: montar hierarquia, mover pessoas, validar teto e "sem gestor"
