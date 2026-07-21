# Perfil de membro e filtro de equipe em Legendários — design

Data: 2026-07-20
Status: implementado e validado (Opção A)
OpenSpec: `openspec/changes/navegacao-perfil-filtro-equipe-legendarios/`

## Contexto

Na tela de detalhe de Equipe, Membros da Equipe mostra nome, função e ações sobre o vínculo, mas não abre o perfil do Legendário. A listagem de Legendários também não possui filtro por equipe.

O diagnóstico confirmou que essas telas usam dimensões de escopo diferentes. `AccessPolicyService.resolveScope` descobre as equipes coordenadas e os escopos `TEAM`, mas `buildLegendaryWhere` considera somente cidade, igreja e IDs explícitos. A separação está documentada no change `controle-acessos-por-usuario`: equipe limita Equipes/Organograma e não amplia a tela Legendários.

## Diagnóstico atual

- `TeamsService.findAll`, `findOne` e `findMembers` aplicam `scope.teamIds`.
- `LegendariosService.findAll`, `findOne` e `options` aplicam o escopo geográfico de `buildLegendaryWhere`, sem equipes.
- Um coordenador apenas com escopo de equipe vê seus membros na Equipe, mas não consegue abrir seus perfis por `/legendarios/:id`.
- `GET /legendarios/:id` exige `legendarios.read`; a lista de membros exige `teams.members.read`.
- `GET /teams/options` exige `teams.read`, porém atualmente não recebe o usuário e não aplica `AccessPolicyService`.
- A relação `Legendary.teamMemberships` já permite filtrar por `teamId`, status e exclusão lógica; não é necessária migration.
- O catálogo de telas em andamento anuncia escopo `TEAM` para Legendários, mas a policy e a spec ativa tratam essa tela como geográfica; essa divergência precisa ser reconciliada antes de implementar e não decide automaticamente pela Opção B.

## Pontos afetados

| Superfície | Mudança |
|---|---|
| Detalhe de Equipe > Membros da Equipe | Nome/ação abre o perfil existente |
| Perfil de Legendário | Retorno à equipe e ações condicionadas às permissões próprias |
| `GET /legendarios/:id` | Leitura geográfica ou por vínculo ativo em equipe autorizada |
| Listagem de Legendários | Novo filtro opcional por equipe |
| `GET /teams/options` | Aplicação do escopo efetivo |
| `AccessPolicyService` e guard | Helper de detalhe e permissão alternativa de leitura |

## Parte 2 — opções de política

### Opção A — conveniência (recomendada e descrita no change)

O usuário escolhe uma equipe autorizada e o filtro reduz o conjunto que ele já poderia ver na listagem de Legendários. A consulta combina `buildLegendaryWhere` E vínculo ativo na equipe. Não muda quem pode ver quem, não afeta Relatórios/Mapa e preserva a regra canônica atual.

Impacto: alteração localizada em DTO, filtros, listagem e options de equipe. Um membro da equipe fora do escopo geográfico continua ausente da listagem.

### Opção B — controle de acesso (não incluída)

O escopo de equipe passaria a limitar a tela Legendários para gestores. Antes de especificar, seria necessário decidir se equipe substitui ou intersecta cidade/igreja e quais consumidores de `buildLegendaryWhere` são afetados: detalhe, options, Relatórios, Mapa e exportações.

Impacto: mudança sensível em quem vê quais pessoas, conflito com a regra de dimensão registrada em `controle-acessos-por-usuario`, maior risco de regressão e necessidade de testes de autorização mais amplos. Não será implementada sem aprovação explícita e revisão dos artefatos.

## Decisões propostas

- Adotar a Opção A para o filtro.
- Reusar `/dashboard/legendarios/:id`; não criar outra tela de perfil.
- Permitir leitura do perfil com `legendarios.read` pelo escopo geográfico atual OU com `teams.members.read` quando houver vínculo ativo em equipe autorizada.
- Manter edição e histórico sob suas permissões próprias; acesso pela equipe é somente leitura.
- Usar `fromTeamId` apenas para navegação de retorno, nunca para autorização.
- Escopar `GET /teams/options` antes de reutilizá-lo.
- Considerar somente `TeamMembership` ativo e não excluído no perfil e no filtro.

## Critérios de aceite

1. Um gestor abre por teclado ou mouse o perfil de membro ativo da equipe autorizada.
2. URL direta para membro fora do escopo não retorna nem confirma o registro.
3. Vínculo inativo/excluído não libera perfil nem entra no filtro.
4. O filtro por equipe retorna a interseção entre equipe e escopo geográfico atual.
5. `teamId` fora do escopo e opções de equipes não vazam nomes ou membros.
6. Busca, filtros, paginação e anti-race continuam funcionando em conjunto.
7. Usuário sem `legendarios.update` ou permissões de histórico não vê nem executa essas ações.
8. Listagem sem `teamId`, Relatórios, Mapa e mutações mantêm o comportamento atual.

## Aprovação necessária

1. Aprovar a Opção A ou solicitar revisão integral para a Opção B.
2. Aprovar a extensão estreita de leitura do perfil por vínculo ativo em equipe autorizada. Sem ela, o objetivo da Parte 1 não funciona para gestores que possuem apenas acesso a Equipes.

As duas decisões foram aprovadas em 2026-07-20 e a implementação seguiu a Opção A.

## Evidências de implementação

- `npm test`: web 29 testes e API 280 testes, todos aprovados.
- `npm run lint`: shared, API e web aprovados.
- Build: shared e API aprovados; Next compilou, validou tipos e gerou 25 páginas. O empacotamento `standalone` parou apenas por `EPERM` ao criar symlinks no Windows.
- Smoke admin: API saudável, 20 opções de equipe, 242 Legendários sem filtro, 9 no filtro exercitado e perfil de membro aberto.
- Smoke restrito com fixture temporária removida ao final: uma única opção autorizada; filtro de equipe sem ampliar escopo geográfico; perfil de membro da equipe retornou 200; filtro de equipe externa ficou vazio; perfil externo retornou 404.
- Confirmação pós-smoke: nenhum usuário técnico temporário permaneceu no banco.
