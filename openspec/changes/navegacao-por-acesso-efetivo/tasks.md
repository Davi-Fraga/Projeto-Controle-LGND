## 1. Cálculo canônico de tela

- [ ] 1.1 Definir no pacote compartilhado o contrato `EffectiveScreenAccess` e os motivos de indisponibilidade
- [ ] 1.2 Extrair um serviço backend comum que combine `SCREEN_CATALOG`, permissions efetivas e policy de escopo
- [ ] 1.3 Calcular nível e usabilidade para telas globais e escopáveis
- [ ] 1.4 Tratar `SELECTED`, `ALL`, valores derivados e dimensões suplementares
- [ ] 1.5 Preservar `COORDINATION_ADMIN` e a exceção administrativa da rota Usuários
- [ ] 1.6 Fazer `AccessControlService.scopeMissing` reutilizar a mesma definição
- [ ] 1.7 Adicionar testes unitários de paridade entre contrato da sessão e painel administrativo

## 2. Sessão autenticada

- [ ] 2.1 Adicionar acesso efetivo ao retorno de login
- [ ] 2.2 Adicionar acesso efetivo ao retorno de `/auth/me`
- [ ] 2.3 Adicionar acesso efetivo ao refresh da sessão
- [ ] 2.4 Atualizar tipos, mocks e fixtures de `CurrentUser` no API e web
- [ ] 2.5 Garantir que o contrato não seja usado por guards como fonte de autoridade
- [ ] 2.6 Adicionar testes de atualização do contrato após mudança de permissions ou scopes

## 3. Manifesto e Sidebar

- [ ] 3.1 Atualizar helpers do manifesto para cruzar regra de entrada e tela utilizável
- [ ] 3.2 Preservar teste de paridade entre manifesto e `SCREEN_CATALOG`
- [ ] 3.3 Atualizar o Sidebar para esconder telas com `MISSING_PERMISSION` ou `MISSING_SCOPE`
- [ ] 3.4 Tratar contrato ausente/carregando de forma fail-closed
- [ ] 3.5 Adicionar testes para Equipes sem scope, scope derivado, `ALL`, tela global e Usuários

## 4. Gate e destino do dashboard

- [ ] 4.1 Criar resolução de pathname para a rota primária e seu `screenId`
- [ ] 4.2 Implementar `DashboardAccessGate` no layout comum cobrindo subrotas
- [ ] 4.3 Criar estados distintos para permission ausente e escopo ausente
- [ ] 4.4 Evitar redirecionar bloqueios de autorização para login
- [ ] 4.5 Atualizar destino pós-login e `/dashboard` para a primeira rota utilizável
- [ ] 4.6 Criar estado terminal estável quando nenhuma rota for utilizável
- [ ] 4.7 Adicionar testes de rota direta, subrota, destino alternativo e ausência de loop

## 5. Controle de Acessos

- [ ] 5.1 Renomear a apresentação de `scopeMissing` para “Acesso ainda não efetivo” ou texto equivalente
- [ ] 5.2 Informar que a aba ficará escondida até existir dimensão satisfatória
- [ ] 5.3 Exibir dimensões satisfatórias, compartilhadas e valores derivados sem permitir removê-los
- [ ] 5.4 Garantir que a UI não revogue permission nem conceda `ALL` automaticamente
- [ ] 5.5 Adicionar testes do aviso e da ausência de mutação automática

## 6. Verificação integrada

- [ ] 6.1 Recompilar `@central-da-manada/shared`
- [ ] 6.2 Executar testes focados do cálculo, auth, manifesto, Sidebar, gate e painel administrativo
- [ ] 6.3 Executar `pnpm --filter api test` e `pnpm --filter web test`
- [ ] 6.4 Executar `pnpm -r lint` e `pnpm --filter api build`
- [ ] 6.5 Fazer smoke com `MISSING`, `SELECTED`, `ALL`, derivado, tela global, admin e nenhuma tela utilizável
- [ ] 6.6 Executar `openspec.cmd validate navegacao-por-acesso-efetivo`
