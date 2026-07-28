## 1. Contrato compartilhado

- [x] 1.1 Em `packages/shared/src/index.ts`, adicionar `missing?: boolean` a `ScopeValueEntry` (D4) e documentar que `label` passa a ser sempre preenchido pelo backend. (Também `sublabel`, para desambiguar igreja→cidade.)
- [x] 1.2 Trocar `ScreenScopeState.configuredValues` de `string[]` para `ScopeValueEntry[]` (D2). Rodar `pnpm -r lint` só para colher a lista de pontos que quebram — é o inventário de trabalho das etapas 2 e 4.
  - **Armadilha achada:** `api`/`web` resolvem `@central-da-manada/shared` por `types: dist/index.d.ts`. Sem `pnpm --filter shared build` antes, o lint passa **falsamente** verde e o inventário sai vazio.
  - Inventário real: `access-control.service.ts:134` (api) e `access-control-panel.tsx:239` (web) — exatamente os grupos 2 e 4.

## 2. Backend — rótulos das dimensões

- [x] 2.1 Em `access-control.service.ts`, criar o resolvedor de rótulos: recebe as dimensões com valores e devolve `Map<value, label>` por tipo, em consultas paralelas `id IN (...)` restritas aos ids em escopo (D1). Nenhuma consulta quando a dimensão está em `ALL`/`MISSING`.
- [x] 2.2 Implementar o rótulo de cada tipo: igreja (nome + cidade como subtítulo), equipe (nome), TOP, cidade via correspondência de `normalizeCityKey` sobre `Legendary.city`, devolvendo a grafia real (D3).
  - **Desvio do design:** TOP usa `TOP #n - nome` com **hífen**, não em-dash, e equipe usa o nome **cru** (não `teamDisplayName`) — é o formato dos `options` que a própria tela carrega. Chip e opção do mesmo item precisam bater; a Open Question do design.md fica resolvida por consistência com o que já está na tela.
- [x] 2.3 Marcar `missing: true, label: null` quando o lookup não encontrar a entidade (excluída/soft-deleted) (D4).
- [x] 2.4 Ligar o resolvedor em `buildScopeBaseState`, preenchendo `label` tanto em `effectiveValues` quanto nos novos `configuredValues`; preservar `sources` (EXPLICIT × ROLE_DERIVED) como está hoje. Também rotula o campo legado `screen.scopes`.
- [x] 2.5 Testes em `access-control.service.spec.ts`: rótulo por dimensão; cidade rotulada com a grafia real (não a key); valor órfão marcado `missing`; `ALL` e `MISSING` **não** disparam consulta de rótulo.

## 3. Backend — contagem do Mapa

- [x] 3.1 Escrever primeiro o teste vermelho: usuário restrito, igreja com legendários fora da fatia dele, contagem exibida deve ser a da fatia (cenário "Contagem por igreja no Mapa respeita o escopo"). Vermelho confirmado: `{"deletedAt":null,"isFromRotaDoCerrado":true}`, sem escopo.
- [x] 3.2 Em `map.service.ts`, aplicar o mesmo predicado de `legendaryWhere` ao `_count.legendarios` de cada igreja (D6). Confirmar que o teste passa e que o caminho admin segue inalterado.

## 4. Frontend — painel legível e alcance explícito

- [x] 4.1 Em `access-control-panel.tsx`, renderizar os chips a partir do `label`, com subtítulo quando houver; nunca cair no `value`. Tratar `missing` com marcação "Item removido". Componente `ScopeValueChip` + `SCOPE_FALLBACK_LABEL` como último recurso.
- [x] 4.2 Semear a edição (`beginSelect`) a partir dos `configuredValues` já rotulados, eliminando a dependência do `labelOf` sobre as options carregadas.
- [x] 4.3 Trocar o realce dos botões `Nenhum / Selecionados / Todos` de `effectiveMode` para `configuredMode`; exibir os valores derivados da função à parte, read-only e identificados (cenário "Vínculo derivado da função não falseia o modo").
- [x] 4.4 Garantir que entrar em "Selecionados" a partir de `MISSING` configurado com derivados presentes tenha saída (não nascer com "Aplicar" travado sem explicação). Aviso de que os vínculos da função seguem valendo e não entram na seleção.
  - Também deixou de afirmar "não verá nenhum dado desta tela" quando existe vínculo derivado da função — era falso.
- [x] 4.5 Derivar no front, a partir das telas já presentes na resposta, quais outras telas **concedidas** usam a dimensão, e exibir o aviso de alcance no editor (D5). Sem aviso quando não houver outra tela.
- [x] 4.6 Testes em `access-control-panel.test.tsx`: nenhum UUID renderizado em nenhum estado; aviso de alcance aparece com duas telas de igreja concedidas e some com uma; botão reflete o configurado com derivados presentes; chip órfão marcado.
  - **Fixture corrigido:** o teste do modo ALL fixava `effectiveMode: 'ALL'` com `configuredMode: 'MISSING'` — combinação impossível nos dados reais (efetivo ALL só nasce de configurado ALL). Era a acoplagem errada codificada no teste.

## 5. Higiene de código

- [x] 5.1 Remover `isCityRestricted`, `isTeamRestricted`, `isChurchRestricted` e `isTopRestricted` de `access-policy.service.ts` (D8). Comentário no lugar explica por que não reintroduzir.
- [x] 5.2 Remover os testes que exercitavam apenas esses métodos em `access-policy.service.spec.ts` e o mock residual em `org-chart.service.spec.ts`. Não remover nenhum teste de `assert*Allowed`/`build*Where`.
  - As chamadas conviviam com asserções de `assert*Allowed` nos mesmos testes: só as linhas dos métodos saíram, nenhum teste perdeu propósito.

## 6. Higiene do catálogo de permissions

- [x] 6.1 Antes de escrever o passo destrutivo, confirmar por busca que `families.create`, `families.read`, `families.update`, `social-actions.restore` e `audit.read` não aparecem em nenhum `@Permissions(...)` nem em `SCREEN_CATALOG`. Registrar o resultado.
  - **A primeira busca deu falso positivo:** grep solto por `families.create` casa `tops.families.create`, que está em uso e é outra chave. Refeita com âncora `(^|[^.a-z-])`.
  - Resultado ancorado: as cinco chaves aparecem **só** em `prisma/seed.ts` e em asserções de *ausência* no `screen-catalog.spec.ts` (que seguem válidas — `grantable` vem do catálogo, não do seed). Zero `@Permissions`, zero entrada de tela. Órfãs confirmadas.
- [x] 6.2 Parar de semear essas cinco chaves em `prisma/seed.ts` (lista de declaração + atribuição ao papel COORDINATION_USER).
- [x] 6.3 Escrever o passo de remoção idempotente, em transação, na ordem `UserPermissionOverride` → `RolePermission` → `Permission` (não há cascade), restrito à lista fechada, registrando quantas linhas foram afetadas (D7).
  - **Ordem importa mais do que o design previa:** o seed concede ao admin `prisma.permission.findMany()` — TODAS as permissions do banco, não a lista do arquivo. A remoção roda ANTES desse bloco, senão o admin ganharia grant de linhas que estão para ser apagadas.
- [x] 6.4 Confirmar que `organogram.read` **não** é tocada (é a chave de destino da Fase 4 do organograma). Verificado: segue na lista.
- [x] 6.5 Rodar o seed duas vezes seguidas em ambiente local e verificar idempotência (segunda execução não falha e não remove nada novo). **VERIFICADO com Postgres real.**
  - Baseline no banco: as 5 órfãs existiam com **9 grants de papel** e 0 overrides — a dependência que estouraria FK sem a ordem correta.
  - 1ª execução: `[seed] permissions órfãs removidas: 5 (...) — 9 grant(s) de papel e 0 override(s) de usuário limpos`. Números casam com o baseline.
  - 2ª execução: **sem a linha de log e sem falha** → idempotente. Estado final: 0 órfãs, as 5 `organogram.*` intactas (incluindo `organogram.read`).
  - **Achado no caminho:** `pnpm db:seed` estava QUEBRADO localmente (`Cannot find module '@central-da-manada/shared'`) — a raiz não declarava o shared, então não havia symlink e o `tsx` não resolvia (Node resolve pelo diretório do arquivo, `prisma/`, não pelo cwd). Só funcionava no deploy, que roda dentro do container da api. Corrigido: shared + `@types/node` nas devDependencies da raiz.

## 7. Verificação

- [x] 7.1 `pnpm --filter api test` — comparar contra o baseline registrado no dia da auditoria (450 testes, 41 suítes). **456/456, 41 suítes** (+6).
- [x] 7.2 `pnpm --filter web test`. **122/122, 31 arquivos** (+6).
- [x] 7.3 `pnpm -r lint` (tsc de api/web/shared + eslint da api) e `pnpm --filter api build`. Ambos limpos.
  - **Pré-requisito descoberto:** `pnpm --filter shared build` ANTES do lint, senão api/web checam contra o `dist` velho e o lint mente.
- [x] 7.4 Conferência manual no painel com um usuário real: dimensão em `SELECTED` mostra nomes; dimensão em `ALL` mostra "Todos"; Líder Espiritual mostra derivados à parte com o botão em "Nenhum". **VERIFICADO contra a API com banco real** (`GET /api/access-control/users/:id`).
  - `SELECTED`: `label: "AD.Manancial Rhema"` em `configuredValues` **e** `effectiveValues`, e no campo legado `scopes`. Zero UUID como rótulo. `scopeTypes: [CHURCH, CITY]` confirma a Fase 2 no ar.
  - `ALL`: `configuredMode: ALL`, `effectiveMode: ALL`, 0 valores.
  - Derivado da função (usuário virou líder espiritual da ADEG, sem escopo explícito): `configuredMode: MISSING` + `effectiveMode: SELECTED` com `sources: [ROLE_DERIVED]` e `label: "ADEG"`, `scopeMissing: false`. É exatamente o estado em que o botão antes indicava "Selecionados" com lista vazia.
  - **Bônus — o bug de produção reproduzido e corrigido ponta a ponta:** MEMBRO com Igreja=ALL → `GET /churches/search` devolve **75 igrejas** (era 0), `/churches/search/cities` devolve 3 cidades (era 0), e `/churches/spiritual-leaders` devolve as mesmas 75. As duas abas finalmente concordam.
  - Contraprova de fail-closed: voltando a dimensão para `MISSING`, a aba Igrejas zera (total 0) e o painel marca `scopeMissing: true`. Nada foi afrouxado.
  - Mutações no banco de dev revertidas (telas revogadas, liderança/papel desfeitos, escopo explícito restaurado). **Exceção:** a senha do usuário `membro.smoke.1784807189939@lgnd.local` foi trocada para o login de teste e o hash original foi perdido.

## 8. Correções de ferramental (achados desta implementação)

- [x] 8.1 `packages/shared`: `lint` passa de `tsc --noEmit` para `tsc -p tsconfig.json` (emite). `api`/`web` resolvem o shared por `types: dist/index.d.ts`, então sem dist fresco o `pnpm -r lint` dava **verde falso** em mudança de contrato. Como o `pnpm -r` roda em ordem topológica, emitir no lint do shared basta.
  - Provado: quebrei o nome de `configuredValues` no fonte do shared e rodei `pnpm -r lint` **sem** build manual → agora acusa `error TS2339: Property 'configuredValues' does not exist`. Antes, silêncio. Arquivo restaurado em seguida.
- [x] 8.2 `prisma/tsconfig.json` novo + `lint` da raiz passa a ser `pnpm -r lint && tsc -p prisma/tsconfig.json`. O `prisma/` (seed, scripts) não era coberto por **nenhum** type-check — erro de tipo ali só aparecia ao rodar contra o banco.
- [x] 8.3 Raiz declara `@central-da-manada/shared` e `@types/node` em devDependencies: destrava `pnpm db:seed` local (ver 6.5) e o type-check de `prisma/`.
- [x] 7.5 Percorrer os cenários das specs delta um a um e marcar cada um como verificado.
  - `Chips de escopo mostram nome, não UUID` → painel: "exibe o nome da igreja com a cidade como subtítulo, e nunca o UUID"; backend: "rotula igreja, equipe e TOP no formato dos seletores da tela".
  - `Desambiguação por subtítulo` → `sublabel` da igreja (cidade) coberto nos dois testes acima.
  - `Valor órfão é sinalizado` → painel: "sinaliza valor cujo item não existe mais"; backend: "marca missing quando o valor aponta para entidade que não existe mais".
  - `Alcance visível antes de editar` → "avisa o alcance quando outra tela concedida usa a mesma dimensão".
  - `Alteração se reflete em todos os cards da dimensão` → garantido por construção (escopo é `(userId, type)`; o `applyScopeSelection` substitui o ACL inteiro pela resposta da API). Sem teste dedicado — é propriedade do modelo, não do componente.
  - `Dimensão sem outra tela concedida` → "não avisa alcance quando a outra tela da dimensão está sem acesso".
  - `Vínculo derivado da função não falseia o modo` → "vínculo derivado da função não falseia o modo: controle indica o configurado".
  - `Entrar em edição a partir do configurado` → "a edição parte dos configurados já rotulados, sem depender das options".
  - `Modo configurado é o que se persiste` → "ALL: mostra 'inclui novos cadastros'" (fixture corrigido) + "clicar 'Todos' envia setScopeSelection(ALL, [])".
  - `Contagem por igreja no Mapa respeita o escopo` → "não-admin: a contagem carrega o mesmo filtro geográfico da listagem" (+ contraprova no caminho admin).
