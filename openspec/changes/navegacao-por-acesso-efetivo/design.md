## Context

O manifesto compartilhado tornou o Sidebar coerente com as permissions de entrada do `SCREEN_CATALOG`. Entretanto, permission e escopo continuam planos separados: uma tela escopável pode estar em VIEW/EDIT e ter todas as dimensões satisfatórias efetivamente `MISSING`. O backend falha fechado e retorna nenhum dado, mas o menu ainda mostra a aba.

O contrato administrativo já calcula `scopeMissing` usando `satisfyingScopeTypes`, `ALL` e escopos derivados. Esse cálculo não deve ser duplicado no browser, nem o endpoint administrativo deve ser aberto ao usuário comum.

## Goals / Non-Goals

**Goals:**

- Produzir um contrato canônico de acesso efetivo por tela para o próprio usuário.
- Usar o contrato no Sidebar, destino inicial e rotas diretas do dashboard.
- Esconder telas sem escopo efetivo sem apagar sua configuração administrativa.
- Distinguir permission ausente de escopo ausente.
- Preservar telas globais, `ALL`, vínculos derivados e a exceção administrativa de Usuários.

**Non-Goals:**

- Não mover autorização para o frontend.
- Não substituir `PermissionsGuard`, `RolesGuard` ou `AccessPolicyService`.
- Não revogar permission quando uma dimensão vira `MISSING`.
- Não conceder `ALL` automaticamente.
- Não tornar escopo específico por tela; `UserScope` continua compartilhado por dimensão.
- Não alterar o schema do banco.

## Decisions

### 1. Extrair cálculo comum de acesso efetivo

Será criado um serviço comum de leitura, reutilizando `SCREEN_CATALOG`, `EffectivePermissionsService` e `AccessPolicyService`. Ele não pertencerá ao controller administrativo de Controle de Acessos.

Para cada tela concedível retornará:

```ts
type EffectiveScreenAccess = {
  screenId: string;
  level: 'NONE' | 'VIEW' | 'EDIT';
  usable: boolean;
  unavailableReason?: 'MISSING_PERMISSION' | 'MISSING_SCOPE';
};
```

Regras:

- sem todo o conjunto VIEW: `NONE`, não utilizável;
- tela global com VIEW: utilizável;
- tela escopável com VIEW e alguma dimensão satisfatória efetiva em `SELECTED` ou `ALL`: utilizável;
- dimensão derivada conta como efetiva;
- dimensão suplementar sozinha não satisfaz;
- `COORDINATION_ADMIN` preserva sua semântica irrestrita;
- Usuários continua sendo exceção por papel, fora do catálogo concedível.

`AccessControlService` reutilizará o cálculo quando montar `scopeMissing`, evitando duas definições.

**Alternativa rejeitada — mandar scopes ao web e recalcular:** expõe detalhes desnecessários e cria deriva entre TypeScript frontend e policy backend.

### 2. O contrato autenticado carrega acesso por tela

Login, refresh e `/auth/me` retornarão o mapa de acesso efetivo junto ao `CurrentUser`. O resultado não será confiado para autorizar APIs; serve apenas para navegação e UX. Alterações administrativas aparecem na próxima atualização de sessão, e o fluxo do painel poderá invalidar/recarregar o usuário corrente quando ele editar a própria conta.

O web novo será publicado depois da API que fornece o campo. Na ausência do campo, o comportamento será fail-closed para itens protegidos.

### 3. Manifesto continua descrevendo rotas, backend decide usabilidade

O manifesto manterá `screenId`, rota, rótulo e regra de permission para paridade arquitetural. `visiblePrimaryNav` passará a exigir que a tela permission-driven também esteja marcada como utilizável. A exceção `users` continuará por papel.

Essa especialização substitui a expectativa anterior de “permission VIEW sempre mostra a aba” quando a tela exige escopo.

### 4. Um gate central protege a experiência das rotas

O layout do dashboard usará um `DashboardAccessGate` que:

- resolve a rota primária pelo manifesto;
- aguarda o carregamento da sessão;
- permite a tela utilizável;
- mostra “Você não possui acesso” para permission ausente;
- mostra “Acesso concedido, mas sem escopo configurado” para `MISSING_SCOPE`;
- evita redirecionar 403/escopo para login;
- oferece retorno para a primeira rota utilizável.

Subrotas herdarão o `screenId` da rota primária. A API continua sendo a barreira real.

**Alternativa rejeitada — adicionar `useRequireScreen` manualmente em cada page:** aumenta o risco de uma subrota nascer sem gate.

### 5. O painel administrativo mantém estados incompletos visíveis

`scopeMissing` continua um estado configurável e fail-closed. A linha receberá texto claro de “Acesso ainda não efetivo”, explicará que a aba ficará escondida e apontará para as dimensões satisfatórias. Escopos compartilhados e derivados serão indicados. Nenhuma alteração automática de permission ou scope ocorrerá.

### 6. Destino inicial usa apenas rotas utilizáveis

Após login e ao abrir `/dashboard`, o sistema escolherá a primeira rota utilizável na ordem do manifesto. Se nenhuma existir, mostrará um estado terminal estável, sem loop de redirects.

## Risks / Trade-offs

- **[Contrato de sessão ficar desatualizado após edição por outro admin]** → permissions da API continuam recalculadas por requisição; web recarrega em refresh/navegação e nunca amplia autoridade.
- **[Web antigo não conhece o campo]** → campo é aditivo; publicar API antes do web.
- **[Web novo falar com API antiga]** → tratar ausência fail-closed e seguir ordem de deploy.
- **[Esconder aba dificultar diagnóstico do usuário]** → painel administrativo mantém `scopeMissing`; URL direta mostra razão específica.
- **[Cálculo duplicado com Controle de Acessos]** → extrair serviço comum e testar paridade.
- **[Organograma possui conjunto VIEW transitório]** → calcular pelo `SCREEN_CATALOG` vigente e preservar teste de paridade com o manifesto.

## Migration Plan

1. Extrair e testar o cálculo comum sem mudar respostas existentes.
2. Adicionar o contrato ao usuário autenticado.
3. Atualizar tipos compartilhados e recompilar `@central-da-manada/shared`.
4. Atualizar manifesto, Sidebar, destino inicial e gate do dashboard.
5. Atualizar o painel administrativo.
6. Executar testes API/web, lint e smokes com `MISSING`, `SELECTED`, `ALL`, derivado e nenhuma tela.
7. Publicar API antes do web.

Não há migration de banco. Em rollback, o campo adicional pode permanecer ignorado pelo web anterior.

## Open Questions

Nenhuma questão bloqueante. A implementação deve apenas escolher o ponto de composição do `DashboardAccessGate` que cubra todas as subrotas sem interferir nas páginas públicas de autenticação.
