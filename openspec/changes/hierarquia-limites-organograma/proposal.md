## Why

O Organograma hoje é só visualização — a hierarquia real de quem gerencia quem não está persistida no banco nem validada. O movimento tem uma regra de gestão concreta (**ninguém gerencia mais de 10 pessoas**, exceto o admin) que precisa ser garantida pelo backend, com vínculos persistidos e redistribuição manual feita pelo administrador.

## What Changes

- **Persiste a hierarquia** de gestão no banco (não só na visualização): vínculos Coordenador→Sub-coordenadores, Sub-coordenador→Integrantes (equipes) e Gestor da Cidade→Líderes, Líder→Legendários (cidades).
- **Regra do teto de 10**: nenhum gestor pode ser responsável por mais de 10 pessoas; o limite é **teto máximo, não valor fixo**. Exceção única: o **administrador** (sem limite).
  - Equipes (3 níveis): Sub-coordenador ≤ 10 Integrantes; Coordenador ≤ 10 Sub-coordenadores.
  - Cidades (2 níveis): cada Líder ≤ 10 Legendários; cidade com >10 exige mais Líderes (ex.: 23 → ≥3 Líderes, como 10+10+3).
- **Distribuição manual**: o admin pode **mover** pessoas entre gestores (Integrante entre Sub-coordenadores; Legendário entre Líderes da cidade). O backend **impede** qualquer movimentação que ultrapasse o teto de 10. (Opcional: sugerir distribuição automática como ponto de partida, controle final manual.)
- O **Organograma passa a ser derivado** desses vínculos persistidos. O backend valida teto, vínculo com a cidade e autorização em create/update/listagem/redistribuição.
- Preserva os campos atuais `coordinatorLegendaryId` e `deputyCoordinatorLegendaryId` (não fundir). **Não** cria role separada para Sub-coordenador nem para Líder de cidade. O acesso ao Organograma respeita o escopo por cidade do Gestor de Cidade (feature `controle-acessos-por-usuario`).

## Capabilities

### New Capabilities
- `org-hierarchy-limits`: hierarquia de gestão persistida (equipes 3 níveis, cidades 2 níveis) com teto de 10 por gestor (admin isento) validado no backend, redistribuição manual entre gestores sem ultrapassar o teto, e o Organograma derivado desses vínculos.

### Modified Capabilities
<!-- `org-chart-global` (spec canônica em openspec/specs/, do change org-chart-global-section) passa a poder derivar a árvore dos vínculos persistidos em vez de apenas inferir; a relação exata será detalhada no design. -->

## Impact

- **Affected specs**: nova capability `org-hierarchy-limits` (e relação com `org-chart-global` existente).
- **Affected code**:
  - Prisma: novos campos/tabelas para os vínculos de gestão (Sub-coordenador→Integrantes, Líder→Legendários) preservando `coordinatorLegendaryId`/`deputyCoordinatorLegendaryId`. Migration nova.
  - API: módulo(s) de Teams/Org-chart — validação do teto de 10 e do vínculo com a cidade em create/update/listagem/redistribuição; endpoint de redistribuição manual.
  - Web: Organograma derivado dos vínculos + UI de redistribuição manual (mover pessoa entre gestores).
- **Dependências**: depende de `controle-acessos-por-usuario` (02) para o escopo por cidade do Gestor de Cidade; provável mudança de schema.
- **Risco**: médio/alto — muda modelo de dados e regras de consistência. Casos de "sem gestor" e transições (saída/troca de gestor) precisam de tratamento e testes explícitos.
