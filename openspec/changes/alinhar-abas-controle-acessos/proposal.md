## Why

A tela **Líderes Espirituais** existe na navegação e na API, mas não aparece no catálogo canônico do Controle de Acessos; sua visibilidade ainda depende de papéis e seu endpoint compartilha `churches.read` com Igrejas, impedindo concessão independente. O inventário também encontrou divergências entre outras abas de primeiro nível, o catálogo e as permissions efetivas, portanto a correção precisa estabelecer paridade verificável para todas as telas, não apenas adicionar um card isolado.

## What Changes

- Adicionar **Líderes Espirituais** ao catálogo do Controle de Acessos como tela somente leitura, com escopo por Igreja e permission própria `spiritual-leaders.read`.
- Proteger `GET /churches/spiritual-leaders` com a nova permission, preservando o filtro real de dados pelo `AccessPolicyService` e a independência em relação à tela Igrejas.
- Alinhar as 11 abas concedíveis de primeiro nível do dashboard ao padrão permission-driven já adotado pelo Controle de Acessos: Painel, Legendários, Equipes, Líderes Espirituais, Mapa, TOPs, Organograma, Ações Sociais, Comunicação, Relatórios e Igrejas.
- Manter **Usuários** como exceção administrativa explícita: a rota continua visível somente para `COORDINATION_ADMIN`, fica fora do `SCREEN_CATALOG` e não pode ser concedida a não-admin por `users.read`/`users.update`.
- Corrigir divergências atuais da navegação: Painel sem gate explícito, Ações Sociais vinculada a `tops.read`, e Igrejas/Líderes Espirituais vinculados a papéis em vez das permissions efetivas de suas telas.
- Direcionar o usuário, após login ou ao entrar em `/dashboard`, para a primeira tela de primeiro nível que ele realmente pode acessar quando `dashboard.read` não estiver concedida; se nenhuma tela estiver disponível, exibir um estado explícito de acesso ainda não configurado.
- Condicionar os atalhos da tela Líderes Espirituais que levam a Legendários a `legendarios.read`, sem transformar a ocultação do link em barreira de segurança.
- Fazer a validação de escopos se apoiar nas telas concedidas do catálogo, permitindo, por exemplo, escopo `CHURCH` para quem possui apenas Líderes Espirituais, sem exigir acesso à tela Igrejas.
- Corrigir a mensagem de escopo vazio para não prometer acesso irrestrito: para não-admin, a ausência de escopo explícito continua fail-closed e ainda pode coexistir com escopos organizacionais derivados da função.
- Preservar o acesso efetivo existente numa migração/backfill idempotente: administradores continuam com acesso total e usuários não-admin que hoje conseguem consultar Líderes Espirituais não perdem esse acesso na introdução da permission independente.
- Adicionar testes de paridade entre abas de primeiro nível, catálogo, navegação e proteção de API para impedir que futuras telas sejam esquecidas ou ligadas à permission errada.
- Manter ações administrativas de criação/exclusão e a segurança no backend conforme o modelo atual; ocultar uma aba no frontend continua não sendo considerado barreira de autorização.

## Capabilities

### New Capabilities

- `access-control-screen-catalog`: cobertura canônica das telas concedíveis, incluindo Líderes Espirituais, permission independente, níveis, escopos, compatibilidade de migração, invariantes de paridade e a exclusão intencional de superfícies administrativas perigosas.
- `permission-driven-navigation`: visibilidade das abas concedíveis baseada nas permissions efetivas correspondentes ao catálogo, com exceções administrativas declaradas e sem substituir a autorização da API.

### Modified Capabilities

- Nenhuma spec principal arquivada é modificada. Esta change estende e reconcilia o comportamento ainda ativo de `controle-acessos-por-usuario` e incorpora as decisões de segurança de `access-scope-semantics-hardening`, que deverão ser respeitadas na ordem de aplicação/arquivamento.

## Impact

- **Backend:** `apps/api/src/common/access/screen-catalog.ts`, `apps/api/src/modules/access-control`, `apps/api/src/modules/churches`, testes de catálogo/serviço/controller e autorização.
- **Banco/seed:** nova permission semeada de forma idempotente e migração/backfill de compatibilidade, sem alteração do modelo relacional.
- **Frontend:** manifesto compartilhado das telas primárias, `apps/web/src/components/layout/Sidebar.tsx`, destino pós-login/dashboard, atalhos de Líderes Espirituais e testes de visibilidade/paridade; o painel de Controle de Acessos passa a receber a nova tela pelo contrato existente.
- **Contratos:** reutiliza `ScreenAccessEntry`, `ScreenAccessLevel`, `UserScreenAccessControl` e `UserScopeType`; nenhuma permission crua será enviada pela UI administrativa.
- **Segurança:** `PermissionsGuard` permanece a barreira de acesso e `AccessPolicyService.buildChurchWhere` permanece a barreira de escopo dos dados de Líderes Espirituais.
- **Changes concorrentes:** há sobreposição intencional com `controle-acessos-por-usuario` e `access-scope-semantics-hardening` nos arquivos centrais de acesso; a implementação deverá partir do hardening aprovado e reconciliar o estado mais recente antes de editar.
