## 1. Contrato compartilhado

- [x] 1.1 Definir `OrgChartView` e `OrgChartNode` em `packages/shared` (id, kind, label, subtitle?, leaderId?, count, children[])
- [x] 1.2 Exportar os tipos no índice de `packages/shared` para uso por API e web

## 2. Backend (módulo tops)

- [x] 2.1 Criar `OrgChartQueryDto` validando `view` ∈ {teams, families, cities}
- [x] 2.2 Adicionar `GET /tops/:id/org-chart` ao `TopsController` (fino) com `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions('tops.read')`, retornando `{ data }`
- [x] 2.3 Implementar no `TopsService` o build da visão **teams** (TOP → coordenação → TopTeam[coordinator] → TopServant; grupo "Sem equipe")
- [x] 2.4 Implementar a visão **families** (TOP → coord. famílias → TopFamily[representante] → TopFamilyMember; família sem chefe sem leaderId)
- [x] 2.5 Implementar a visão **cities** (TOP → cidade normalizada → TopParticipant; grupo "Sem cidade")
- [x] 2.6 Calcular `count` (descendentes-pessoa) e preencher `leaderId` por nó; garantir `id` estável/único
- [x] 2.7 Validar TOP inexistente (404) e `view` inválida (400) via DTO/serviço

## 3. Frontend (feature org-chart)

- [x] 3.1 Decidir e instalar a stack de render (recomendado: `@xyflow/react` + `d3-hierarchy`) — ver Open Questions do design
- [x] 3.2 Criar `apps/web/src/features/org-chart/api.ts` consumindo `/tops/:id/org-chart?view=` via `@/lib/api`
- [x] 3.3 Criar o componente de árvore: layout top-down a partir do `OrgChartNode`, nó custom com label + subtitle + bolinha de contador
- [x] 3.4 Cor por líder (hash determinístico de `leaderId` → paleta; neutro quando ausente) com herança na subárvore
- [x] 3.5 Interações read-only: zoom, pan e expandir/recolher (estado local de nós colapsados)
- [x] 3.6 Seletor das três visões (Equipes / Chefes de Família / Cidades)
- [x] 3.7 Criar rota `apps/web/src/app/dashboard/tops/[id]/organograma/page.tsx` e link "Organograma" na tela de detalhe do TOP
- [x] 3.8 Estados de carregando / vazio / erro

## 4. Testes e verificação

- [x] 4.1 Teste de service: cada visão monta a árvore esperada (incluindo grupos "Sem equipe"/"Sem cidade" e família sem chefe) e `count` agregado correto
- [x] 4.2 Teste de contrato: as 3 visões retornam o mesmo shape `OrgChartNode`
- [x] 4.3 Teste de guarda: sem `tops.read` → 403; `view` inválida → 400
- [x] 4.4 Conferir `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` passam
- [x] 4.5 Conferência visual: renderiza um TOP real nas 3 visões com zoom/pan/recolher, cor por líder e contador na bolinha
