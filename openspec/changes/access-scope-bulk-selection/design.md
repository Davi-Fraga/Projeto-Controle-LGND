## Context

O modelo atual possui `UserScope` com cardinalidade 1:N e unicidade por
`(userId, type, value)`. Portanto, o backend já consegue armazenar várias cidades,
equipes, igrejas e TOPs, mas o fluxo de edição é unitário: o `ScopeAdder` envia um
`POST` por item e o `AsyncCombobox` fecha após cada seleção.

O hardening `access-scope-semantics-hardening` estabeleceu duas garantias que esta
change não pode enfraquecer:

1. usuário não administrador sem escopo efetivo é negado (`fail-closed`);
2. permissão de tela e escopo de dados são controles independentes.

Também existem escopos derivados do papel do usuário. A política efetiva é a
união entre a configuração explícita e os vínculos derivados, mas o
`scopeMissing` atual considera apenas registros explícitos. Além disso,
Legendários não possui um tipo de escopo próprio: sua listagem é geográfica
(`CITY` e `CHURCH`), enquanto `TEAM` é apenas suplementar em determinados
detalhes. Tratar qualquer um desses tipos como equivalente produz sinalização
enganosa.

Os endpoints de opções possuem paginação/limite. Carregar todos os registros no
browser para criar vários `UserScope` não representa “todos”, não inclui
cadastros futuros e cria uma janela de atualização parcial.

## Goals / Non-Goals

**Goals:**

- representar sem ambiguidade `MISSING`, `SELECTED` e `ALL` por usuário e tipo;
- permitir edição de vários valores em uma única operação atômica;
- fazer `ALL` abranger registros atuais e futuros da dimensão;
- manter filtros e verificações diretas com a mesma semântica;
- refletir escopo explícito e derivado no estado retornado à interface;
- evitar que a seleção de escopo conceda permissões ou capacidades
  administrativas;
- preservar compatibilidade segura durante migração e eventual rollback;
- produzir auditoria compreensível, sem uma sequência de eventos parciais.

**Non-Goals:**

- criar um tipo `LEGENDARY` em `UserScopeType`;
- tornar escopo específico por tela; um tipo continua compartilhado entre as
  telas que o consomem;
- fazer `CITY` autorizar automaticamente a listagem de Igrejas; a questão
  cross-type de Igrejas continua fora desta change;
- redesenhar papéis, catálogo de permissões ou capacidades de escrita;
- recolocar “Usuários” no catálogo concedível;
- alterar a regra de acesso a `/access-control`, exclusiva de
  `COORDINATION_ADMIN`;
- substituir todos os comboboxes da aplicação; o componente multi-select pode
  ser específico/reutilizável, mas somente os consumidores desta change entram
  no escopo;
- implementar a feature antes da conclusão do smoke 9.4 do hardening.

## Decisions

### 1. Persistir o modo em uma política separada

Será adicionado um enum persistido:

```text
UserScopeSelectionMode = SELECTED | ALL
```

e uma entidade com unicidade por usuário e tipo:

```text
UserScopePolicy
- id
- userId
- type: UserScopeType
- mode: UserScopeSelectionMode
- createdAt
- updatedAt
- unique(userId, type)
```

`MISSING` é um estado calculado: não há política explícita nem valores explícitos
para o tipo. `SELECTED` exige pelo menos um `UserScope` do mesmo tipo. `ALL` exige
zero `UserScope` explícito daquele tipo. Essas invariantes são mantidas na mesma
transação.

Os registros existentes serão migrados para políticas `SELECTED`, uma por par
distinto `(userId, type)`.

**Alternativas rejeitadas:**

- valor sentinela como `value="*"`: mistura metadado com identificador, pode
  atravessar validações e torna consultas/auditoria frágeis;
- materializar todos os IDs: não inclui novos registros, depende de paginação e
  gera grande volume de escrita;
- inferir `ALL` apenas pela ausência de linhas: conflita diretamente com
  `MISSING` e reabriria o comportamento fail-open.

### 2. Separar estado configurado de estado efetivo

O contrato de leitura informará, por `UserScopeType`:

- `configuredMode`: `MISSING`, `SELECTED` ou `ALL`;
- `configuredValues`: IDs escolhidos explicitamente;
- `effectiveMode`: `MISSING`, `SELECTED` ou `ALL`;
- `effectiveValues`: união deduplicada dos IDs explícitos e derivados quando o
  modo efetivo for `SELECTED`;
- `sources`: indicação de contribuição `EXPLICIT` e/ou `ROLE_DERIVED`.

Regras de composição:

1. `ALL` explícito domina a dimensão;
2. `SELECTED` explícito é unido aos IDs derivados;
3. `MISSING` explícito com IDs derivados resulta em efetivo `SELECTED`;
4. ausência de ambos resulta em efetivo `MISSING`.

A interface edita apenas a parte configurada e exibe os valores derivados como
somente leitura. Assim ela não promete remover um acesso que continuará vindo do
papel.

### 3. Usar flags por dimensão no `AccessPolicyService`

O objeto interno de política terá sinalização explícita de dimensão irrestrita,
por exemplo:

```text
allCities
allTeams
allChurches
allTops
```

Essas flags são independentes de `isAdmin`. Para cada dimensão:

| Estado efetivo | Builder de filtro | Assert por ID |
|---|---|---|
| `MISSING` | condição impossível | nega/404 conforme contrato do recurso |
| `SELECTED` | `where` restrito aos IDs efetivos | permite somente IDs efetivos |
| `ALL` | sem predicado restritivo daquela dimensão | permite qualquer ID daquela dimensão |

Todos os consumidores da política — listagens, detalhes, dashboard, opções
escopadas e relatórios — devem usar essa mesma resolução.

**Alternativa rejeitada:** reutilizar `isAdmin` para `ALL`. Isso concederia
capacidades administrativas fora da dimensão escolhida.

### 4. “Todos os Legendários” significa geografia completa

Não será criado um escopo `LEGENDARY`. A ação apresentada na interface será
“Todas as cidades (todos os Legendários)” e persistirá `CITY=ALL`.

Como os escopos são por usuário e não por tela, a UI deve informar que essa
configuração também afeta outras telas geográficas que o usuário já tenha
permissão para acessar. Ela não concede essas telas.

`CHURCH=ALL` autoriza todos os registros cobertos pela dimensão Igreja;
`TEAM=ALL` autoriza a dimensão Equipe; `TOP=ALL`, a dimensão TOP. `TEAM` não
passa a satisfazer sozinho o escopo da listagem de Legendários.

### 5. Tornar os requisitos de escopo do catálogo semanticamente explícitos

O metadado de tela distinguirá:

- `satisfyingScopeTypes`: dimensões que tornam a tela utilizável;
- `supplementalScopeTypes`: dimensões que podem ampliar detalhes/recortes, mas
  não satisfazem o acesso principal;
- combinação `ANY_OF` para as telas atuais com mais de uma dimensão válida.

Para Legendários, `CITY` e `CHURCH` são satisfatórios e `TEAM` é suplementar.
Para Igrejas, Equipes e TOPs, a própria dimensão é satisfatória. As demais telas
devem declarar a regra já usada pelo `AccessPolicyService`, sem ampliar acesso.

`scopeMissing` será calculado sobre o estado **efetivo** das dimensões
satisfatórias. Valores derivados do papel contam; dimensões suplementares,
sozinhas, não contam.

### 6. Substituir o conjunto de um tipo em uma operação atômica

Será criado:

```http
PUT /access-control/users/:userId/scopes/:type
Content-Type: application/json

{
  "mode": "MISSING" | "SELECTED" | "ALL",
  "values": ["uuid", "..."]
}
```

Validações:

- `type` deve pertencer a `UserScopeType`;
- `MISSING` e `ALL` exigem `values=[]`;
- `SELECTED` exige de 1 a 500 valores UUID únicos;
- todos os valores devem existir e pertencer ao tipo informado;
- qualquer valor inválido rejeita a operação completa com `400`;
- apenas `COORDINATION_ADMIN` pode executar a operação.

Na mesma transação, o serviço valida o estado, substitui as linhas do tipo,
atualiza/remove `UserScopePolicy` e registra a alteração lógica. Repetir o mesmo
payload produz o mesmo estado, sem duplicatas.

O retorno traz o estado configurado e efetivo normalizado, suficiente para a UI
substituir sua cópia local sem nova composição.

Os endpoints unitários existentes ficam temporariamente disponíveis:

- `POST` adiciona valor no modo `MISSING`/`SELECTED` e garante a política
  `SELECTED`;
- `DELETE` remove valor de `SELECTED`; ao remover o último, transita para
  `MISSING`;
- operações unitárias incompatíveis com `ALL` retornam
  `409 SCOPE_MODE_CONFLICT`, orientando o cliente a usar o `PUT`.

**Alternativa rejeitada:** executar vários `POST` em paralelo no browser. A
solução permitiria sucesso parcial, auditoria ruidosa e estado intermediário
inseguro.

### 7. Usar seleção múltipla com estado preparado no frontend

Cada dimensão terá dois modos visíveis:

- **Todos:** mostra “inclui novos cadastros” e não carrega a coleção inteira;
- **Selecionados:** permite busca paginada, checkboxes, chips removíveis e
  seleção em várias consultas.

As mudanças ficam em estado local até “Aplicar”. Selecionar um item não fecha o
seletor. “Cancelar” restaura o estado recebido da API. A interface mostra um
resumo antes de trocar entre `ALL` e `SELECTED/MISSING`.

Itens derivados do papel aparecem separados e bloqueados para edição, com a
origem indicada.

### 8. Auditar a intenção, não cada linha

Uma aplicação gera um evento lógico `ACCESS_SCOPE_SELECTION_UPDATED` contendo:

- administrador responsável;
- usuário afetado;
- tipo;
- estado anterior normalizado;
- estado posterior normalizado;
- data/hora e contexto já adotado pelo sistema.

IDs podem ser registrados; nomes mutáveis são apenas enriquecimento. Falha ao
persistir auditoria impede a confirmação da alteração quando a auditoria
participar da mesma unidade transacional adotada pelo módulo.

### 9. Manter a segurança independente da experiência visual

O backend não confiará na UI para aplicar as regras:

- `ALL` não cria `permissions`;
- `ALL` não altera `role`;
- usuário sem permissão recebe `403`, mesmo com `ALL`;
- recurso fora de um escopo `SELECTED` continua indistinguível por ID (`404`
  nos contratos já endurecidos);
- usuário comum continua impedido de abrir ou chamar `/access-control`;
- `users.update` continua fora do catálogo e não pode ser obtido por esta tela.

## Risks / Trade-offs

- **[Estado duplicado entre política e valores]** → constraints, serviço único e
  testes de invariantes; `ALL` nunca mantém valores e `SELECTED` nunca fica
  vazio.
- **[Rollback após alguém configurar `ALL`]** → código antigo verá zero valores
  e negará por fail-closed; há perda temporária de disponibilidade, não
  vazamento. Não remover a tabela na reversão emergencial.
- **[UI sugerir que o escopo é específico da tela]** → nomear a dimensão e
  explicar quais telas concedidas compartilham o recorte.
- **[Role-derived tornar “remover tudo” ineficaz]** → exibir fonte derivada
  separadamente e recalcular o estado efetivo no backend.
- **[Payload selecionado excessivo]** → limite de 500, busca paginada e opção
  `ALL` para o caso irrestrito.
- **[Drift entre filtros e asserts]** → testes de matriz compartilhados para
  cada dimensão e proibição de lógica paralela nos controllers.
- **[Concorrência entre dois administradores]** → substituição transacional com
  semântica last-write-wins e auditoria completa de antes/depois.
- **[Specs ativas contraditórias]** → reconciliar
  `alinhar-abas-controle-acessos` antes de considerar esta change pronta para
  implementação.

## Migration Plan

1. Concluir e aprovar o smoke 9.4 de `access-scope-semantics-hardening`.
2. Isolar o hardening em branch/commit próprio somente após aval explícito do
   Davi.
3. Criar migração aditiva com enum/tabela/índices de política.
4. Fazer backfill idempotente: para cada `(userId,type)` existente, criar
   política `SELECTED`.
5. Validar antes do deploy que não há `UserScope` órfão, duplicado ou com tipo
   inconsistente.
6. Publicar API compatível com dados legados e endpoints unitários protegidos.
7. Publicar frontend que usa o contrato atômico.
8. Executar testes automatizados, smoke dos três modos e testes de segurança em
   produção imediatamente após o deploy.

**Rollback:** reverter aplicação sem remover a estrutura aditiva. Configurações
`SELECTED` continuam representadas nos `UserScope`; configurações `ALL` ficam
fail-closed no código antigo. Restaurar o release novo ou converter `ALL` para
valores explícitos apenas como ação operacional consciente, nunca
automaticamente.

## Open Questions

Nenhuma questão de produto bloqueante. A questão cross-type de Igrejas permanece
registrada no hardening e não será resolvida implicitamente por esta change.
