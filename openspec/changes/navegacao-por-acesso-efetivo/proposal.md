## Why

Hoje a navegação considera apenas permissions: um usuário pode receber a aba de uma tela escopável e encontrar uma lista vazia porque nenhuma dimensão satisfatória está efetiva. A interface precisa distinguir permission concedida de tela realmente utilizável sem transformar o frontend na barreira de segurança.

## What Changes

- Introduzir um contrato backend de acesso efetivo por tela, derivado do `SCREEN_CATALOG`, das permissions e dos escopos satisfatórios efetivos.
- Considerar `ALL` e vínculos derivados da função como escopo válido; dimensões suplementares não satisfazem sozinhas uma tela.
- Expor ao usuário autenticado apenas a informação necessária para navegação, incluindo telas utilizáveis e motivo de indisponibilidade.
- Esconder no Sidebar telas com permission, mas sem escopo efetivo, inclusive Equipes.
- Aplicar o mesmo contrato ao destino pós-login e ao acesso direto às rotas do dashboard.
- Mostrar estado específico para permission ausente e para permission presente sem escopo, sem redirecionar ambos para login.
- Manter `scopeMissing` visível no painel administrativo e orientar a configuração sem conceder `ALL` ou revogar permissions automaticamente.
- Preservar guards e policies do backend como autoridade real.

## Capabilities

### New Capabilities

- `effective-screen-access`: cálculo canônico de nível, usabilidade e motivo de indisponibilidade de cada tela.
- `usable-dashboard-navigation`: Sidebar, destino inicial e rotas do dashboard condicionados ao acesso efetivo.

### Modified Capabilities

Nenhuma spec canônica em `openspec/specs` é modificada. O novo contrato especializa a navegação permission-driven definida por changes ainda não sincronizadas.

## Impact

- Backend: serviços comuns de acesso e fluxos de `auth/login`, `auth/me` e `auth/refresh`.
- Compartilhado: contratos de `CurrentUser`, acesso efetivo e helpers do manifesto de navegação.
- Web: Sidebar, layout do dashboard, destino pós-login e painel de Controle de Acessos.
- Dados existentes não serão alterados; configurações `scopeMissing` continuarão fail-closed e terão a aba escondida.
- Banco: nenhuma migration prevista.
