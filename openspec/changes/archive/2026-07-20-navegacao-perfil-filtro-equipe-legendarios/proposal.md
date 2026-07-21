## Why

O detalhe de Equipe expõe quem participa dela, mas não oferece acesso ao perfil já existente do Legendário. Ao mesmo tempo, a listagem de Legendários não permite filtrar por equipe e a política atual separa deliberadamente o escopo geográfico de Legendários do escopo de Equipes, portanto a melhoria precisa preservar essa fronteira sem introduzir uma mudança silenciosa em quem pode ver quais pessoas.

## What Changes

- Tornar o nome do membro, ou uma ação equivalente, um link para a rota existente `/dashboard/legendarios/:id` a partir de Membros da Equipe.
- Autorizar a leitura do perfil quando o Legendário possuir vínculo ativo com uma equipe já autorizada ao usuário, sem ampliar a listagem geral de Legendários e sem conceder permissão de edição.
- Adicionar `teamId` como filtro opcional, server-side e combinável com busca, paginação e filtros existentes na listagem de Legendários.
- Tratar o filtro de equipe como conveniência (Opção A): ele reduz o conjunto já visível pelo escopo geográfico atual e nunca amplia nem redefine o acesso do usuário.
- Aplicar `AccessPolicyService` ao endpoint reutilizado de opções de equipes, evitando listar equipes fora do escopo e rejeitando/neutralizando `teamId` não autorizado.
- Cobrir navegação, acesso direto, combinação de filtros e ausência de vazamento em testes de backend e frontend.
- Manter fora deste change a Opção B, que restringiria gestores aos membros de suas equipes na tela Legendários. Essa alternativa altera a regra canônica de dimensão de escopo e só poderá entrar após aprovação explícita e revisão destes artefatos.

## Capabilities

### New Capabilities
- `team-member-profile-navigation`: navegação da lista de membros para o perfil existente e autorização estreita de leitura para membros de equipes em escopo.

### Modified Capabilities
- `legendarios-search`: acrescenta o filtro opcional por equipe, aplicado no backend em interseção com o escopo efetivo e com os demais filtros.

## Impact

- Frontend: detalhe de Equipe, listagem/filtros de Legendários, cliente de API e tipos compartilhados.
- Backend: `LegendariosService`, DTO de consulta, `TeamsController`/`TeamsService.options` e helpers específicos do `AccessPolicyService`.
- Banco: usa a relação existente `Legendary.teamMemberships`; não requer nova tabela nem migração prevista.
- Segurança: corrige a ausência de escopo em `GET /teams/options`; preserva a política geográfica da listagem de Legendários e adiciona somente leitura de perfil para vínculo ativo em equipe autorizada.
- Compatibilidade: sem alteração de comportamento para requisições que não enviam `teamId`; administradores permanecem irrestritos.
- Dependência de planejamento: deve permanecer coerente com o change ativo `controle-acessos-por-usuario`, cuja regra atual afirma que escopo de equipe não entra na listagem de Legendários.
