## Context

O Controle de Acessos por usuário é dirigido pelo `SCREEN_CATALOG` do backend. `AccessControlService.getUserScreenAccess` percorre esse catálogo e devolve `tela + nível + tipos de escopo + escopos + toggles`; o frontend apenas renderiza o contrato. A navegação lateral, porém, mantém uma segunda lista manual e mistura três critérios (`permission`, `anyPermission` e `roles`). Isso produziu divergências observáveis:

| Rota primária | Estado atual | Divergência |
|---|---|---|
| `/dashboard` | Sem gate no menu; API exige `dashboard.read` | A aba aparece mesmo sem acesso |
| `/dashboard/lideres-espirituais` | Gate por papéis; ausente do `SCREEN_CATALOG`; API exige `churches.read` | Não é concedível e fica acoplada a Igrejas |
| `/dashboard/acoes-sociais` | Menu exige `tops.read`; API exige `social-actions.read` | Aba errada pode aparecer ou sumir |
| `/dashboard/igrejas` | Menu exige papel admin; catálogo concede `churches.read` | Concessão por tela não reflete na navegação |
| `/dashboard/usuarios` | Menu exige papel admin; o hardening removeu `users` do catálogo | Exceção intencional: `users.update` permite gerar links de redefinição de senha e não pode ser concedida a não-admin |
| `/dashboard/organograma` | Regra transitória duplicada no menu e no catálogo | Precisa ser reconciliada com o change proprietário |

O endpoint `GET /churches/spiritual-leaders` já aplica `AccessPolicyService.resolveScope` e `buildChurchWhere`, portanto a separação da permission não exige duplicar consulta, service ou módulo. A identidade do líder (`spiritualLeaderLegendaryId`), o usuário que possui login/escopo (`spiritualLeaderUserId`) e os campos operacionais livres continuam conceitos diferentes.

O modelo de escopo atual é `UserScope(userId, type, value)`: ele é compartilhado por dimensão do usuário, não armazenado por `screenId`. O catálogo apenas declara em quais telas cada tipo é aplicável. Para não-admin, `buildChurchWhere` é fail-closed: sem igreja vinda de `UserScope` ou da função organizacional, a consulta retorna conjunto vazio. A mensagem atual “Sem restrição — acesso a tudo desta tela” não representa essa regra.

Exceto `COORDINATION_ADMIN`, papéis são apenas “Função na Manada” e não concedem permissions efetivas. Administradores continuam com base total; não-admin dependem de `UserPermissionOverride(GRANT)`. A rota Usuários é uma exceção de segurança deliberada: permanece vinculada ao papel administrativo e fora do catálogo, pois `users.update` alcança geração de links de redefinição de senha. As changes ativas `controle-acessos-por-usuario` e `access-scope-semantics-hardening` são proprietárias dos mesmos arquivos centrais e precisam ser reconciliadas antes da aplicação.

## Goals / Non-Goals

**Goals:**

- Tornar Líderes Espirituais uma tela concedível e revogável independentemente de Igrejas.
- Garantir que as 11 rotas primárias concedíveis possuam identidade de tela, regra de visibilidade e correspondência no catálogo, e que Usuários seja declarada como exceção administrativa.
- Fazer menu e destino inicial refletirem permissions efetivas nas telas concedíveis, sem usar papéis como atalho de autorização; Usuários continua exigindo `COORDINATION_ADMIN`.
- Preservar a segurança no backend, o escopo de Igreja e o acesso efetivo legítimo existente durante a migração.
- Tornar a relação navegação↔catálogo verificável automaticamente para evitar nova deriva.
- Manter mensagens de escopo honestas e a validação de escopo extensível para novas telas.

**Non-Goals:**

- Não transformar Líderes Espirituais em um novo domínio, controller ou tabela; a view continua no módulo `churches`.
- Não juntar `spiritualLeaderUserId`, `spiritualLeaderLegendaryId` e `spiritualLeaderName`.
- Não criar nível EDIT para Líderes Espirituais; edição de Igreja continua pertencendo à tela Igrejas e às permissions `churches.*`.
- Não tornar create/delete/restore de entidades de topo concedível a não-admin.
- Não tornar Usuários concedível a não-admin nem reintroduzir `users.*` no `SCREEN_CATALOG`.
- Não alterar o modelo relacional de `UserScope` para escopo por tela; os escopos continuam compartilhados por dimensão do usuário.
- Não concluir nesta change a migração própria do Organograma para `organogram.read`; apenas exigir reconciliação atômica com o estado canônico encontrado no momento da implementação.
- Não adicionar autorização apenas no frontend nem criar uma segunda policy de escopo.

## Decisions

### 1. Permission dedicada e tela somente leitura

Será criada a permission `spiritual-leaders.read`. O `SCREEN_CATALOG` ganhará:

```ts
{
  id: 'spiritual-leaders',
  label: 'Líderes Espirituais',
  view: ['spiritual-leaders.read'],
  edit: [],
  scopeTypes: [UserScopeType.CHURCH],
}
```

O nível EDIT enviado para essa tela será normalizado para VIEW pelo comportamento genérico já existente. Definir Líderes Espirituais como NONE/VIEW manipulará somente `spiritual-leaders.read`; definir Igrejas como NONE/VIEW/EDIT manipulará somente `churches.read`/`churches.update`.

**Alternativa rejeitada — reutilizar `churches.read`:** manteria as duas linhas acopladas. Alterar uma tela alteraria a outra, contrariando a expectativa do Controle de Acessos.

**Alternativa rejeitada — criar `spiritual-leaders.update`:** a rota é uma visão de Igrejas e não possui mutação própria. Criar permission sem operação correspondente produziria um nível enganoso.

### 2. Manifesto compartilhado das rotas primárias

Será criado em `packages/shared` um manifesto sem dependências de React contendo `screenId`, `href`, `label` e regra de entrada discriminada: permissions (`allOf` ou `anyOf`) para telas concedíveis ou papel administrativo para exceções protegidas. O Sidebar consumirá esse manifesto e anexará apenas o ícone por `screenId`; não manterá gates paralelos fora da definição canônica.

O `SCREEN_CATALOG` continuará sendo a fonte da verdade de autorização e da tradução nível→permissions das telas concedíveis. O manifesto compartilhado será o contrato de navegação. Testes validarão que cada item permission-driven aponta para exatamente uma tela existente e que suas permissions de entrada pertencem ao conjunto de leitura canônico daquela tela. Itens administrativos deverão declarar a exceção e permanecer fora do catálogo concedível. `families` e `users` não poderão reaparecer como telas fantasmas. A invariância exigida é **toda aba concedível está no catálogo; toda exceção administrativa está declarada e testada**.

Mapeamento pretendido:

| `screenId` | Rota | Regra de entrada |
|---|---|---|
| `dashboard` | `/dashboard` | `dashboard.read` |
| `legendarios` | `/dashboard/legendarios` | `legendarios.read` |
| `teams` | `/dashboard/equipes` | `teams.read` |
| `spiritual-leaders` | `/dashboard/lideres-espirituais` | `spiritual-leaders.read` |
| `map` | `/dashboard/mapa` | `map.read` |
| `tops` | `/dashboard/tops` | `tops.read` |
| `org-chart` | `/dashboard/organograma` | conjunto VIEW canônico após reconciliar o change proprietário |
| `social-actions` | `/dashboard/acoes-sociais` | `social-actions.read` |
| `communications` | `/dashboard/comunicacao` | `communications.read` |
| `reports` | `/dashboard/relatorios` | `reports.read` |
| `churches` | `/dashboard/igrejas` | `churches.read` |
| `users` | `/dashboard/usuarios` | papel `COORDINATION_ADMIN` (exceção administrativa; fora do catálogo concedível) |

Para uma tela concedível, a regra de entrada corresponderá a todas as permissions de `view`. Para Usuários, apenas o papel `COORDINATION_ADMIN` autoriza navegação e backend; conceder manualmente `users.read` ou `users.update` a um não-admin não deve expor a rota nem a capacidade de redefinir senha. Se o Organograma ainda estiver em compatibilidade legada, seu modo (`allOf`/`anyOf`) e seu conjunto deverão ser documentados e testados explicitamente; a implementação não poderá preservar silenciosamente uma regra diferente do catálogo ativo.

**Alternativa rejeitada — corrigir apenas os cinco itens divergentes no array local:** resolveria o sintoma atual, mas não impediria a próxima aba de nascer fora do catálogo.

**Alternativa rejeitada — buscar o catálogo administrativo para montar o Sidebar:** esse endpoint opera sobre o usuário administrado e exige privilégio de gestão. O usuário corrente já recebe suas permissions efetivas em `auth/login`, `auth/me` e `auth/refresh`; a navegação deve usar esse contrato.

### 3. Backend permanece a barreira real

Somente `GET /churches/spiritual-leaders` trocará `@Permissions('churches.read')` por `@Permissions('spiritual-leaders.read')`. `GET /churches`, detalhe, geocode e mutações continuam com `churches.*`. `ChurchesService.spiritualLeadersView` continuará resolvendo o usuário corrente e aplicando `buildChurchWhere` antes da busca.

Consequências intencionais:

- `churches.read` sozinho não autoriza a view de Líderes Espirituais.
- `spiritual-leaders.read` sozinho não autoriza listagem/detalhe/edição de Igrejas.
- Papel `SPIRITUAL_LEADER` sozinho não concede a tela; ele pode contribuir com `churchIds` organizacionais somente depois que a tela for concedida.
- Requisição direta sem a permission correta recebe 403, independentemente do estado do menu.

### 4. Escopo elegível derivado do catálogo

O mapa rígido `SCOPE_REQUIRED_PERMISSION` será substituído por uma checagem derivada do catálogo: um tipo de escopo poderá ser adicionado quando existir ao menos uma tela concedida cujo `scopeTypes` contenha o tipo e cujo conjunto VIEW esteja efetivo para o usuário. A entidade informada continuará sendo validada no banco e normalizada antes do `upsert`.

Isso permite `CHURCH` com apenas `spiritual-leaders.read`, `CITY` com uma tela geográfica concedida e futuras telas sem ampliar manualmente outro mapa. A regra não transforma escopo em permission: o usuário precisa dos dois planos — permission da tela e dados permitidos pelo `AccessPolicyService`.

Como `UserScope` é compartilhado por tipo, adicionar Igreja em Líderes Espirituais também restringe outras telas concedidas que consomem `CHURCH`. O painel continuará exibindo o mesmo chip nas linhas aplicáveis. A mensagem de lista vazia será “Nenhum escopo explícito configurado; o acesso efetivo depende da função e da política de escopo”, ou texto semanticamente equivalente. Não será prometido acesso global.

**Alternativa rejeitada — aceitar `CHURCH` se houver `churches.read` ou `spiritual-leaders.read` em um array hardcoded:** funciona hoje, mas recria a duplicação que causou o defeito.

### 5. Migração aditiva e idempotente

A permission será criada antes de o novo controller entrar em produção. A migração/backfill deverá:

1. inserir `spiritual-leaders.read` se ainda não existir;
2. vinculá-la ao papel `COORDINATION_ADMIN` sem duplicar `RolePermission`;
3. para cada não-admin com override efetivo `GRANT` de `churches.read`, criar `GRANT` de `spiritual-leaders.read` se ainda não houver override dessa nova permission;
4. não conceder a nova permission automaticamente com base em papéis não-admin;
5. não copiar `churches.update/create/delete`, nem criar qualquer mutação de Líderes Espirituais;
6. manter o seed de acesso idempotente e ciente da nova permission.

O critério de cópia preserva quem realmente passava pelo `PermissionsGuard` antes da separação. Usuários que apenas viam um item por causa do gate incorreto de papel, mas recebiam 403 na API, não ganharão acesso novo por acidente.

### 6. Destino inicial e links cruzados

O login já retorna o `CurrentUser`; após autenticar, o frontend calculará a primeira rota permitida na ordem do manifesto. `/dashboard` continuará sendo o destino preferencial quando `dashboard.read` estiver presente. Sem essa permission, o usuário irá para a primeira outra aba permitida. A entrada direta em `/dashboard` aplicará a mesma decisão. Se nenhuma rota primária estiver autorizada, será exibido um estado estável “Acesso ainda não configurado”, sem loop de redirects e sem tratar 403 como erro de credencial.

Na view de Líderes Espirituais, o perfil do legendário vinculado e “Ver legendários” só serão links quando `legendarios.read` estiver efetivo. Sem essa permission, os dados permitidos da própria view podem permanecer visíveis, mas a interface não oferecerá navegação para uma tela proibida. A API de Legendários continuará protegida por `legendarios.read`.

### 7. Cobertura automatizada como regra de arquitetura

Os testes deverão cobrir quatro planos:

- **Catálogo:** conjunto completo de IDs primários, unicidade, permission nova, somente VIEW e escopo CHURCH.
- **Serviço:** independência Igrejas↔Líderes, nível VIEW/NONE, escopo CHURCH com a nova permission, rejeição sem tela compatível e auditoria genérica preservada.
- **API:** metadata/guard do endpoint, 403 com permission errada e filtragem de igrejas fora do escopo.
- **Web/contrato:** manifesto permission-driven para telas concedíveis, exceção administrativa de Usuários declarada, mapeamento correto das rotas, destino pós-login, estado sem acesso e links cruzados condicionais.

## Risks / Trade-offs

- **[Perda de acesso ao trocar a permission do endpoint]** → backfill a partir do `GRANT churches.read`, migration antes do deploy da API e smoke com usuário não-admin existente.
- **[Nova deriva entre manifesto e catálogo]** → manifesto consumido diretamente pelo Sidebar e teste do backend que valida IDs/permissions contra `SCREEN_CATALOG`.
- **[Colisão com `controle-acessos-por-usuario`, hardening ou Organograma]** → partir do hardening aprovado, reler estado/instruções dos changes proprietários, revisar diff e atualizar manifesto+catálogo na mesma unidade.
- **[Reintrodução do vetor de reset de senha]** → manter `users` fora do catálogo, testar a exceção administrativa e negar a rota/capacidade a não-admin mesmo diante de `users.*` residual.
- **[Escopo global por dimensão surpreende o administrador]** → manter chips compartilhados, texto explícito e não prometer independência por tela nesta change.
- **[Menu atualizado antes da API ou vice-versa]** → deploy compatível e aditivo: migration/seed → API → web. O backend antigo ignora a nova permission; o web novo só deve entrar após a API.
- **[Usuário sem Painel cair em loop]** → helper determinístico de primeira rota e estado terminal sem acesso.
- **[Links de Legendários vazarem navegação]** → condicionar links por `legendarios.read`; o backend continua negando acesso direto.
- **[Permission nova usada para editar Igreja]** → não incluir `churches.update` no screen `spiritual-leaders` e testar independência dos conjuntos.

## Migration Plan

1. Concluir o smoke do hardening e reconciliar `controle-acessos-por-usuario`, `access-scope-semantics-hardening` e o estado atual do Organograma; confirmar o conjunto VIEW canônico e a exceção administrativa de Usuários antes de editar arquivos compartilhados.
2. Criar migration/data-backfill aditivo e atualizar `prisma/seed.ts` para semear `spiritual-leaders.read` e o grant administrativo idempotente.
3. Atualizar catálogo, validação de escopo, controller e testes de API; executar testes focados antes do web.
4. Publicar o manifesto compartilhado, reconstruir `@central-da-manada/shared` e atualizar Sidebar, landing e links cruzados.
5. Executar `pnpm --filter api test`, `pnpm --filter web test` e `pnpm -r lint`; rodar `openspec validate alinhar-abas-controle-acessos`.
6. Fazer smoke com: admin; usuário com apenas Líderes+uma Igreja; usuário com apenas Igrejas; usuário com Ações Sociais sem TOPs; usuário sem Painel; usuário sem nenhuma tela.

**Rollback:** reverter API/web para o comportamento anterior é seguro porque migration e permission são aditivas. A permission e os GRANTs novos podem permanecer inertes durante rollback; não serão apagados automaticamente para evitar perda de configuração. Uma remoção definitiva exigiria change separada e inventário de uso.

## Open Questions

Nenhuma decisão de produto permanece bloqueante para a spec. Antes da implementação, apenas deverá ser resolvido o estado técnico concorrente do Organograma: usar o conjunto legado ainda vigente ou `organogram.read` caso a fase proprietária já tenha sido aplicada. Em ambos os casos, catálogo e manifesto serão atualizados/testados juntos.
