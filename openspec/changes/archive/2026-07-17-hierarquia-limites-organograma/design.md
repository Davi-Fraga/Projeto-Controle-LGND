## Context

O Organograma (changes `org-chart-*`, já entregues) é read-only e infere a estrutura. Agora o negócio exige persistir quem gerencia quem e validar o teto de 10 por gestor no backend, com redistribuição manual. As regras de negócio foram fechadas (teto de 10 para todos exceto admin; distribuição manual; sobras tratadas pelo teto). Restam 2 decisões menores (estado "sem gestor" e transições).

## Goals / Non-Goals

**Goals**
- Persistir os vínculos de gestão (equipes 3 níveis, cidades 2 níveis).
- Validar teto de 10 por gestor no backend (admin isento).
- Redistribuição manual com bloqueio de violação do teto.
- Organograma derivado dos vínculos.

**Non-Goals**
- Não criar roles novas (Sub-coordenador/Líder não são roles).
- Não fundir `coordinatorLegendaryId`/`deputyCoordinatorLegendaryId`.
- Não reimplementar o controle de acesso/escopo (vem de `user-access-control`/02).
- Distribuição automática total não é meta (no máximo sugestão de ponto de partida).
- **UI de redistribuição manual e redesenho visual do Organograma: fora do escopo — feature completa separada.** Esta change entrega só o backend (hierarquia persistida, teto, endpoints de redistribuição, organograma derivado).

## Decisions

### Modelo dos vínculos de gestão
Inspecionar o schema atual (Team, TeamMembership, Legendary, campos de coordenação) antes de modelar. Provável: um vínculo "gerido por" para Integrante→Sub-coordenador e Legendário→Líder (campo/tabela), preservando os campos de coordenação atuais. Migration nova.

### Validação do teto no backend
A regra do teto (≤10, admin isento) mora no service, validada em create/update/listagem-de-atribuição/redistribuição. Contagem de geridos por gestor antes de aceitar. Erro de domínio tratado (ex.: 409/422) quando excede.

### Redistribuição manual
Endpoint de "mover pessoa para gestor X" que: valida escopo/autorização, valida teto do destino, troca o vínculo atomicamente (sem duplicar), e registra auditoria. Opcional: endpoint de sugestão de distribuição (não obrigatório).

### "Sem gestor" e transições (decisões a fechar)
Provável: estado "sem gestor" sinalizado (campo nulo + flag/derivação), não trava cadastro. Saída/troca de gestor → geridos voltam para "sem gestor". Confirmar a modelagem exata na inspeção.

## Risks / Trade-offs

- **Mudança de schema** num domínio central (Legendary/Team) → migration cuidadosa + backfill dos vínculos existentes (se houver). Nunca alterar migration aplicada.
- **Consistência sob concorrência**: mover/atribuir precisa ser atômico para não furar o teto nem duplicar vínculo.
- **Acoplamento com 02**: o escopo por cidade vem de `user-access-control`; se 02 não estiver pronto, o Organograma por cidade fica sem o gate de escopo. Ordem: 02 antes de 04.
- **Distribuição automática**: tentar gerar automaticamente pode conflitar com o controle manual → manter manual como fonte de verdade.

## Migration Plan

Migration nova adicionando os vínculos de gestão, preservando os campos atuais. Backfill conservador (se possível derivar vínculos existentes; senão, todos começam "sem gestor" para o admin distribuir). Implementar atrás de testes do teto, redistribuição, "sem gestor" e transições. Regenerar Prisma client (dev parado) após a migration.

## Open Questions (resolvidas — aprovadas pelo Davi em 2026-07-17)

- **Modelo do "gerido por": ✅ campos self-relation.** `TeamMembership.managerMembershipId` (integrante → sub-coordenador, ambos memberships da mesma equipe) e `Legendary.cityLeaderId` (legendário → Líder, ambos legendários). Não fundir os campos de coordenação existentes.
- **"Sem gestor": ✅ campo nulo / derivado.** Sem flag extra. Cidades: `cityLeaderId` nulo = sem Líder. Equipes: `managerMembershipId` nulo = gerido direto pelo coordenador da equipe (membership implícita), não "sem gestor" — o "sem gestor" de fato é o caso das cidades.
- **Transição: ✅ automática.** Ao sair/trocar/ficar indisponível um gestor (soft-delete, mudança de cidade, inatividade), o backend zera o vínculo dos geridos (→ nulo) para o admin redistribuir.
- **Backfill: ✅ começa tudo "sem gestor".** Não há sub-estrutura persistida hoje (organograma é plano), então não há o que derivar; colunas nuláveis, linhas existentes ficam sem vínculo até o admin distribuir.
- **Sugestão automática: ✅ fora desta entrega.** Distribuição 100% manual (fonte de verdade).

### Teto de 10 — interpretação por hierarquia
- **Cidade:** cada `cityLeaderId` (Líder) ≤ 10 legendários. Cidade com >10 exige mais Líderes (23 → ≥3).
- **Equipe:** cada `managerMembershipId` (sub-coordenador) ≤ 10 integrantes; o coordenador da equipe ≤ 10 memberships diretas (`managerMembershipId` nulo). Admin (`isAdmin`) isento em ambos.
