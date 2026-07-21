## Context

Hoje `AccessPolicyService.resolveScope` reúne equipes coordenadas pelo usuário e escopos `TEAM` explícitos em `scope.teamIds`. `TeamsService.findAll`, `findOne` e `findMembers` usam essa dimensão, mas `buildLegendaryWhere` usa somente cidade, igreja e IDs explícitos. Essa separação é intencional e está documentada no change ativo `controle-acessos-por-usuario`: Legendários, Relatórios e Mapa são geográficos; Equipes e Organograma são segmentados por equipe.

O resultado atual para um coordenador que possui apenas escopo de equipe é: ele vê sua equipe e seus membros, porém a listagem e `GET /legendarios/:id` não retornam esses Legendários. Além disso, a rota de detalhe exige `legendarios.read`; a tela de membros usa `teams.members.read`. O endpoint `GET /teams/options`, embora protegido por `teams.read`, não recebe o usuário e não aplica escopo.

Há uma divergência no trabalho concorrente: o catálogo atual da tela Legendários anuncia `TEAM` entre seus tipos de escopo, enquanto `buildLegendaryWhere` e a spec ativa de controle de acesso ignoram equipe nessa tela. A implementação deste change SHALL reconciliar essa inconsistência com o change proprietário antes de alterar arquivos compartilhados; ela não será usada como justificativa implícita para adotar a Opção B.

A relação necessária já existe como `Legendary.teamMemberships -> TeamMembership`, com `teamId`, `status` e `deletedAt`. A tela de perfil existente é `/dashboard/legendarios/:id` e o padrão de navegação para ela já aparece no Organograma.

## Goals / Non-Goals

**Goals:**
- Abrir o perfil existente de um membro a partir de uma equipe autorizada.
- Permitir leitura do perfil para vínculo ativo em equipe autorizada, sem conceder edição ou acesso a outros Legendários.
- Adicionar filtro server-side por equipe à listagem de Legendários como conveniência.
- Garantir que opções, parâmetros diretos e resultados respeitem o escopo no backend.
- Reusar os filtros, a paginação, a relação Prisma e o `AccessPolicyService` existentes.

**Non-Goals:**
- Fazer o escopo de equipe ampliar ou restringir a listagem geral de Legendários.
- Alterar as regras de Relatórios, Mapa ou exportações.
- Conceder edição, criação de histórico ou visualização de histórico sem as permissões próprias.
- Criar endpoint ou tela de perfil duplicados.
- Implementar a Opção B sem aprovação explícita e revisão da spec de controle de acesso.

## Decisions

### 1. Baseline da Parte 2: Opção A, filtro de conveniência

`teamId` será um filtro opcional aplicado com `AND` ao `where` já produzido por `buildLegendaryWhere`. O filtro usará `teamMemberships.some` com `teamId`, `status = ACTIVE` e `deletedAt = null`. Logo, ele só reduz o conjunto geograficamente visível; nunca inclui um membro que o usuário não veria sem o filtro.

Alternativa B considerada: tornar `scope.teamIds` uma restrição obrigatória da tela Legendários para gestores de equipe. Ela foi excluída porque contradiz a regra canônica atual de dimensão da tela e exige decidir se equipe deve substituir ou intersectar cidade/igreja. Também pode afetar detalhe, options, Relatórios e Mapa se `buildLegendaryWhere` for alterado globalmente.

### 2. Equipe escolhida também precisa estar autorizada

O frontend carregará opções pelo endpoint existente `GET /teams/options`, mas o controller passará `@CurrentUser` e o service aplicará `resolveScope` + `buildTeamWhere`. O backend validará o `teamId` recebido pela listagem contra o mesmo escopo; para não-admin, um ID fora do escopo produzirá conjunto vazio ou resposta indistinguível de recurso inexistente, sem revelar nome ou membros.

Isso evita que um usuário geograficamente autorizado use IDs arbitrários para inferir pertencimento a equipes que não pode consultar. Administradores continuam podendo filtrar por qualquer equipe ativa.

### 3. Autorização de perfil separada da autorização de listagem

Não será alterado o comportamento de `buildLegendaryWhere` usado pela listagem. O `AccessPolicyService` ganhará um helper específico para leitura de detalhe que autoriza:

- o escopo geográfico atual; OU
- vínculo ativo e não excluído do Legendário com uma equipe presente em `scope.teamIds`.

Esse helper será usado somente na leitura do perfil necessária à navegação. Não será reutilizado automaticamente por listagem, options, relatórios, mapa ou mutações.

### 4. Permissão any-of somente para leitura do perfil

Como o guard atual exige todas as permissões declaradas, será adicionado um contrato reutilizável de permissões alternativas para `GET /legendarios/:id`: `legendarios.read` OU `teams.members.read`. A barreira de dados continuará no service; possuir `teams.members.read` sem equipe em escopo não retorna perfil algum.

A tela ocultará Editar Cadastro para quem não possui `legendarios.update`. O histórico só será solicitado/renderizado com `legendarios.history.read`; adicionar nota continua exigindo `legendarios.history.create`. Nenhuma mutação muda de permissão.

### 5. Navegação preserva o contexto da equipe

O nome do membro será um link acessível para `/dashboard/legendarios/:id?fromTeamId=:teamId`. O parâmetro serve apenas para montar o retorno à equipe e não participa da autorização. A API sempre valida o usuário e o vínculo; alterar o query param não concede acesso.

### 6. Integração com busca e filtros existentes

`teamId` será incluído em `LegendarioQueryDto`, `LegendaryFilters` e no cliente de API. Alterá-lo volta a paginação para a primeira página e participa da mesma proteção anti-race já usada por busca e filtros. As opções de equipe serão buscadas no backend com o mecanismo de options existente, sem lista hardcoded.

## Risks / Trade-offs

- [Leitura de perfil amplia o detalhe para gestores de equipe] -> limitar a vínculos ativos em `scope.teamIds`, manter campos sensíveis já redigidos e não alterar mutações ou listagem.
- [Any-of mal aplicado pode abrir outros endpoints] -> metadado/decorator separado, testes unitários do guard e uso inicial somente em `GET /legendarios/:id`.
- [Endpoint de opções hoje não tem escopo] -> corrigir antes de conectá-lo ao filtro e testar usuário restrito e administrador.
- [Filtro pode revelar associação a uma equipe por ID direto] -> validar a equipe antes da consulta e falhar sem revelar existência.
- [Change ativo de controle de acesso pode alterar os mesmos arquivos] -> implementar depois de reconciliar/ordenar os changes e preservar a regra de dimensão geográfica.
- [Vínculo inativo aparecer no filtro ou liberar perfil] -> exigir `TeamMembership.status = ACTIVE` e `deletedAt = null` em ambos os caminhos.

## Migration Plan

1. Aprovar explicitamente a Opção A e a extensão estreita de leitura do perfil.
2. Reconciliar o change com `controle-acessos-por-usuario` antes de editar arquivos compartilhados.
3. Entregar primeiro os contratos e testes de backend, incluindo o fechamento de `teams/options`.
4. Entregar navegação e filtro no frontend, preservando estados e permissões de ações.
5. Executar testes focados e validação manual com admin, gestor com equipe em escopo e usuário fora do escopo.
6. Rollback: remover filtro/link e o uso do any-of; o schema do banco não muda.

## Open Questions

- Aprovar a Opção A descrita nestes artefatos ou revisar o change para a Opção B?
- Aprovar a leitura do perfil por `teams.members.read` quando houver vínculo ativo em equipe autorizada? Sem essa extensão, gestores que só têm acesso à tela Equipes verão o link, mas receberão 403/404 no perfil.
