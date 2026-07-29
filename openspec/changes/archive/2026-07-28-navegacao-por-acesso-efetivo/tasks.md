## 1. Cálculo canônico de tela

- [x] 1.1 Definir no pacote compartilhado o contrato `EffectiveScreenAccess` e os motivos de indisponibilidade
- [x] 1.2 Extrair um serviço backend comum que combine `SCREEN_CATALOG`, permissions efetivas e policy de escopo
- [x] 1.3 Calcular nível e usabilidade para telas globais e escopáveis
- [x] 1.4 Tratar `SELECTED`, `ALL`, valores derivados e dimensões suplementares
- [x] 1.5 Preservar `COORDINATION_ADMIN` e a exceção administrativa da rota Usuários
- [x] 1.6 Fazer `AccessControlService.scopeMissing` reutilizar a mesma definição
- [x] 1.7 Adicionar testes unitários de paridade entre contrato da sessão e painel administrativo

## 2. Sessão autenticada

- [x] 2.1 Adicionar acesso efetivo ao retorno de login
- [x] 2.2 Adicionar acesso efetivo ao retorno de `/auth/me`
- [x] 2.3 Adicionar acesso efetivo ao refresh da sessão
- [x] 2.4 Atualizar tipos, mocks e fixtures de `CurrentUser` no API e web
- [x] 2.5 Garantir que o contrato não seja usado por guards como fonte de autoridade
- [x] 2.6 Adicionar testes de atualização do contrato após mudança de permissions ou scopes

## 3. Manifesto e Sidebar

- [x] 3.1 Atualizar helpers do manifesto para cruzar regra de entrada e tela utilizável
- [x] 3.2 Preservar teste de paridade entre manifesto e `SCREEN_CATALOG`
- [x] 3.3 Atualizar o Sidebar para esconder telas com `MISSING_PERMISSION` ou `MISSING_SCOPE`
- [x] 3.4 Tratar contrato ausente/carregando de forma fail-closed
- [x] 3.5 Adicionar testes para Equipes sem scope, scope derivado, `ALL`, tela global e Usuários

## 4. Gate e destino do dashboard

- [x] 4.1 Criar resolução de pathname para a rota primária e seu `screenId`
- [x] 4.2 Implementar `DashboardAccessGate` no layout comum cobrindo subrotas
- [x] 4.3 Criar estados distintos para permission ausente e escopo ausente
- [x] 4.4 Evitar redirecionar bloqueios de autorização para login
- [x] 4.5 Atualizar destino pós-login e `/dashboard` para a primeira rota utilizável
- [x] 4.6 Criar estado terminal estável quando nenhuma rota for utilizável
- [x] 4.7 Adicionar testes de rota direta, subrota, destino alternativo e ausência de loop

## 5. Controle de Acessos

- [x] 5.1 Renomear a apresentação de `scopeMissing` para “Acesso ainda não efetivo” ou texto equivalente
- [x] 5.2 Informar que a aba ficará escondida até existir dimensão satisfatória
- [x] 5.3 Exibir dimensões satisfatórias, compartilhadas e valores derivados sem permitir removê-los
- [x] 5.4 Garantir que a UI não revogue permission nem conceda `ALL` automaticamente
- [x] 5.5 Adicionar testes do aviso e da ausência de mutação automática

## 6. Verificação integrada

- [x] 6.1 Recompilar `@central-da-manada/shared`
- [x] 6.2 Executar testes focados do cálculo, auth, manifesto, Sidebar, gate e painel administrativo
- [x] 6.3 Executar `pnpm --filter api test` e `pnpm --filter web test`
- [x] 6.4 Executar `pnpm -r lint` e `pnpm --filter api build`
- [x] 6.5 Fazer smoke com `MISSING`, `SELECTED`, `ALL`, derivado, tela global, admin e nenhuma tela utilizável
- [x] 6.6 Executar `openspec.cmd validate navegacao-por-acesso-efetivo`
