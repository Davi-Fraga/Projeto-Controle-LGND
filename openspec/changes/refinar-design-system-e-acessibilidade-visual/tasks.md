## 1. Baseline e critérios visuais

- [x] 1.1 Inventariar cores, tamanhos tipográficos, espaçamentos, bordas, sombras e estados interativos usados no frontend
- [x] 1.2 Selecionar dashboard e controle de acessos como referências iniciais de tela comum e tela densa
- [x] 1.3 Registrar screenshots baseline em 1600x900 e 390x844 para os estados definidos nas specs
- [x] 1.4 Documentar a escala visual proposta e o mapa de valores atuais para tokens semânticos

## 2. Fundações e componentes compartilhados

- [x] 2.1 Definir tokens CSS de canvas, superfícies, texto, bordas, destaque, foco e feedback em `globals.css`
- [x] 2.2 Padronizar escala tipográfica e espaçamento responsivo sem aumentar indiscriminadamente a densidade das tabelas
- [x] 2.3 Criar ou consolidar componentes compartilhados de botão, campo, superfície e cabeçalho de página usando os tokens
- [x] 2.4 Padronizar estados hover, focus-visible, active, selected e disabled nos componentes compartilhados
- [x] 2.5 Adicionar suporte a `prefers-reduced-motion` para pulsos, spinners decorativos e transições de deslocamento
- [x] 2.6 Adicionar testes focados dos contratos visuais e semânticos dos componentes compartilhados

## 3. Shell e navegação acessível

- [x] 3.1 Garantir nome acessível, `aria-expanded`, `aria-controls` e alvo mobile adequado no toggle da navegação
- [x] 3.2 Garantir abertura e fechamento do menu mobile pelo toggle e pelo backdrop sem interceptação indevida
- [x] 3.3 Aplicar foco visível consistente à sidebar, header, menus de ação e navegação por teclado
- [x] 3.4 Validar que manifesto, `screenAccess` e destinos permission-driven permanecem inalterados
- [x] 3.5 Cobrir shell desktop/mobile com testes de interação e QA de viewport

## 4. Estados de feedback

- [x] 4.1 Criar componentes ou padrões compartilhados para loading estrutural, vazio, erro e sucesso
- [x] 4.2 Migrar validação de sessão e dashboard para estados de carregamento estáveis e acessíveis
- [x] 4.3 Migrar uma lista representativa para vazio orientado, busca sem resultados e recuperação de erro
  - Lista escolhida: **Legendários** (a mais usada). Três estados distintos, antes fundidos num
    único "Nenhum Legendário encontrado.": lista vazia (orienta a cadastrar, e a ação só aparece
    com `legendarios.create`), busca sem resultado (oferece limpar busca e filtros) e erro
    (oferece "Tentar de novo", que refaz a busca via `reloadKey`).
  - 6 testes novos, incluindo um que garante que a mensagem de erro **não vaza detalhe técnico**
    (`ECONNREFUSED`, IP, stack). `page.test.tsx` 14/14.
- [x] 4.4 Padronizar progresso e prevenção de envio duplicado em um formulário representativo
  - Formulário escolhido: **Legendário**. `disabled` no botão não impedia envio duplicado — o
    Enter e o clique repetido reentram no handler antes do re-render. Trava síncrona por `ref`,
    liberada em todas as saídas (3 validações + `finally`).
  - Progresso deixou de ser só o texto do botão: `aria-busy` no form e região viva `role="status"`.
    Erro virou `role="alert"`. Botões migrados para o `Button` compartilhado.
  - 4 testes novos. **Provados vermelhos**: sem a trava, 3 envios geram **3 gravações**; sem a
    liberação, o formulário trava após o primeiro envio (2 testes falham).
- [x] 4.5 Adicionar testes dos estados assíncronos e de recuperação sem expor mensagens técnicas ou dados sensíveis

## 5. Densidade e responsividade

- [x] 5.1 Refinar hierarquia de cards e ações do dashboard reduzindo bordas sem função semântica
- [x] 5.2 Criar padrão mobile para filtros extensos com busca e ação principal sempre acessíveis
  - `components/ui/FilterPanel.tsx`: secundários recolhem no mobile; busca, contador de ativos,
    resumo dos filtros aplicados e a saída para limpar **nunca** somem. Aplicado em Legendários
    (9 filtros). 5 testes.
- [x] 5.3 Criar padrão responsivo para tabelas largas preservando identificação e ações dos registros
  - `DataTable` passou a renderizar duas composições: tabela a partir de `md`, cartões no mobile.
    Cada coluna declara papel — `title` (identidade, vira cabeçalho do cartão), `actions` (topo
    direito, nunca some) e o resto vira par rótulo/valor.
  - **Custo assumido:** o dado fica duas vezes no DOM. No navegador só uma composição aparece
    (`display:none` também tira da árvore de acessibilidade), mas o JSDOM não aplica CSS — **toda
    tela migrada precisa escopar as consultas dos testes** a uma das composições. Está documentado
    no `DataTable.test.tsx` e no teste da lista de Legendários.
  - Bug encontrado pelo próprio teste: sem coluna `title`, a primeira coluna virava cabeçalho **e**
    continuava nos detalhes — o nome aparecia duas vezes no cartão. Corrigido.
- [x] 5.4 Migrar legendários, igrejas e equipes como primeira onda de listas e formulários
  - [x] **Legendários** — a mais complexa, migrada por inteiro: `FilterPanel`, `DataTable` com
    papéis de coluna, estados vazio/sem-resultado/erro e paginação do componente. 14 testes verdes.
  - [x] **Igrejas** — migrada. Único ajuste além do escopo dos testes: o vazio passou a
    distinguir "nenhuma cadastrada" de "nenhuma para esta busca", e o erro ganhou recuperação
    reaproveitando o `refreshKey` que a tela já tinha.
  - [x] **Equipes** — migrada. Não tinha teste de página consultando a tabela, então não
    precisou de escopo; o vazio passou a distinguir "nenhuma cadastrada" de "nenhuma para esta
    busca", com ação de criar condicionada a `teams.create`.
- [x] 5.5 Migrar TOPs, ações sociais, comunicação e usuários como segunda onda de listas e formulários
  - **TOPs** — a tabela mais larga (9 colunas). Primeira aplicação real do papel `hideOnMobile`:
    o número do TOP sai do cartão como coluna e aparece embutido no título.
  - **Ações Sociais** — direto no molde.
  - **Comunicação** — a cadeia de 8 ternários que traduzia o público-alvo virou o mapa
    `TARGET_LABELS`, fora do JSX.
  - **Usuários** — o `map` usava `user` como nome do item, sombreando o `user` autenticado do
    escopo externo; o acessor passou a usar `item`. Gates inalterados.
- [x] 5.6 Refinar shell e controles ao redor de acesso, relatórios, mapa e organograma sem alterar cores de dados especializadas
  - Migradas: **Relatórios**, **Mapa** e **Controle de Acessos** — superfícies, bordas, texto e
    destaque passaram a tokens. Resultado: **zero cores cruas** nas três telas.
  - **A regra foi respeitada.** Onde a cor CODIFICA dado, nada foi tocado:
    `features/map/rota-map.tsx` (o mapa em si) e o organograma
    (`features/org-chart/color.ts` e `org-chart-node.tsx`). Só a casca ao redor mudou.

## 6. Validação e documentação

- [x] 6.1 Executar testes do frontend e lint/type-check completo após cada onda
  - `npx vitest run --maxWorkers=1` → **224/224** (42 arquivos). O paralelo é instável nesta
    máquina: os arquivos que falham mudam a cada rodada, sem relação com o que foi tocado.
  - `pnpm lint` da raiz → verde em `packages/shared`, `apps/web`, `apps/api` e `prisma/`.
    O `pnpm -r lint` **não** substitui: deixa `prisma/` sem type-check nenhum.
- [x] 6.2 Executar QA Playwright funcional em desktop e mobile, incluindo teclado, toque e ciclos reversíveis
  - **Passou:** foco visível em 180/180 paradas de Tab real (12 telas × 15); zero erro de console
    nas 12 telas; toggle mobile 44x44 com `aria-controls` e `aria-label` que acompanha o estado;
    drawer fecha pelo backdrop, pelo toggle e ao navegar, com ciclo estável em 3 repetições;
    `FilterPanel` 44px reversível com a busca sempre visível no mobile.
  - **Defeito corrigido — `ActionMenu` era inoperável por teclado.** Abria com Enter mas o foco
    ficava no gatilho, seta não navegava, Escape não fechava, e como o menu vive num
    `createPortal` no fim do `<body>` eram **12 Tabs** até o primeiro item. Faltava qualquer
    handler de teclado: só existia `mousedown` para clique fora. Agora segue o padrão WAI-ARIA de
    menu button — Enter/Espaço/ArrowDown abrem no primeiro item, ArrowUp no último, setas circulam,
    Home/End, Escape fecha e devolve o foco ao gatilho, Tab fecha em vez de deixar o foco vazar.
    Itens com `tabIndex={-1}` (foco roving), então não entram mais na ordem de tabulação da página.
    7 testes novos, **provados vermelhos antes** da implementação, e confirmado no navegador.
  - **Fica em aberto (decisão de escopo do Davi, não esquecimento):**
    - `ConfirmDialog` não é um diálogo: sem `role`/`aria-modal`/`aria-labelledby`, o foco nunca
      entra, Escape não fecha, 6 Tabs vazam para a navegação e o botão X não tem nome acessível.
    - Botão "Sair" 42x36 no mobile (abaixo dos 44); 1 combobox sem nome acessível na tela de
      Legendários; os 20 gatilhos de ação têm o nome idêntico "Ações", sem contexto da linha.
    - Escape não fecha o drawer mobile. **Não é violação de spec** — a 3.2 pede toggle e backdrop,
      e ambos funcionam —, mas é expectativa comum de drawer.
- [x] 6.3 Executar QA visual separado nos estados inicial, denso, carregando, vazio, erro, modal/menu aberto e pós-interação
  - 6 estados × 2 viewports (1600x900 e 390x844): **zero overflow horizontal** e **zero elemento
    clipado** nas 12 combinações. Erro não vaza detalhe técnico e oferece recuperação.
  - **Defeito corrigido — a lupa cobria o placeholder da busca de Legendários** (14px de
    sobreposição). Causa raiz: `.input` estava solto no `globals.css`, **depois** de
    `@tailwind utilities`; com a mesma especificidade (0,1,0), vencia por ordem de origem e
    `className="input pl-9"` nunca surtia efeito. Igrejas e Líderes Espirituais escapavam com
    `style={{ paddingLeft }}` inline — a gambiarra que denunciava o problema.
    O bloco foi para `@layer components`, devolvendo a última palavra ao utilitário.
  - **Efeito colateral medido e aceito:** utilitários que antes perdiam calados passaram a valer.
    O único visível é em TOPs, onde os campos de data (`input text-xs w-1/2`) agora rendem os
    12px que a classe sempre pediu; a altura segue 44px e nenhuma tela ganhou overflow.
- [x] 6.4 Verificar ausência de overflow não intencional, clipping, contraste fraco, foco oculto e alvos pequenos
  - Varredura automatizada em **10 telas x 2 viewports** (1600x900 e 390x844).
  - **Overflow horizontal: zero** nas 20 combinações (`scrollWidth` <= viewport sempre).
  - **Padrão responsivo confirmado no navegador:** nas telas com `DataTable`, a composição
    desktop fica `display: none` e a mobile `flex`, com cartões renderizados. Só uma aparece.
  - **Foco:** regra global `:where(...):focus-visible` cobre os controles; medido por Tab real
    (não por `.focus()`, que não dispara `:focus-visible`).
  - **Defeitos corrigidos:**
    - gatilho do `ActionMenu` tinha **nome acessível vazio** (só `title`, que é fallback fraco e
      inútil no toque) e 36px -> ganhou `aria-label` e virou 44x44
    - paginação do `DataTable` com 34px -> `min-h-11`
    - cabeçalho, divisores e estados do `DataTable` ainda em cores cruas -> tokens
  - **Pendente (fora do escopo desta varredura):** botão "Sair" do header (36px) e os links de
    criar das páginas (40px) seguem abaixo de 44px. São por página, não em componente
    compartilhado.
- [x] 6.5 Publicar guia curto de tokens, tipografia, superfícies, ações e critérios para novos componentes
- [x] 6.6 Revisar valores crus remanescentes e registrar exceções justificadas de mapa, organograma e gráficos

  **Exceções justificadas — cor como DADO, não como estilo:**

  | Arquivo | Cores cruas | Por que fica |
  |---|---|---|
  | `features/org-chart/color.ts` | 12 | Paleta de subdivisão: cada ramo do organograma recebe uma cor que o identifica. Tokenizar destruiria a distinção entre ramos. |
  | `features/org-chart/org-chart-node.tsx` | 32 | Estados do nó (foco, alvo de drop válido/inválido, arraste) e a espinha colorida por subdivisão, derivada do arquivo acima. |
  | `features/map/rota-map.tsx` | 1 | Cor do marcador no mapa. |

  Nas telas de casca — Relatórios, Mapa e Controle de Acessos — não sobrou nenhuma cor crua.

  **Correção posterior (07/08/2026) — a tabela acima estava incompleta.** O QA da 6.2 revelou que
  o `components/ui/ConfirmDialog.tsx` tinha **19 valores crus** e não constava nem como migrado
  nem como exceção: a varredura da 6.6 passou pelas telas e não pelos componentes compartilhados
  que elas montam. Ele foi migrado para tokens (`surface`, `line`, `content-*`,
  `feedback-{danger,warning,info}`), e agora a afirmação de "zero cores cruas" se sustenta.
  O scrim segue `bg-black/75` **de propósito**, como o backdrop da `Sidebar` — scrim é véu, não
  superfície da paleta.

## 7. Organização das abas em grupos

Pedido do Davi em 06/08/2026: a navegação tinha 12 itens numa lista plana e a ordem era arbitrária
(Igrejas em 11º sendo cadastro-base como Legendários, em 2º; Mapa no meio dos cadastros).

Agrupamento aprovado: **Painel** solto no topo · **Manada** (Legendários, Líderes Espirituais,
Igrejas) · **Estrutura** (Equipes, Organograma) · **Atividades** (TOPs, Ações Sociais, Comunicação)
· **Análise** (Mapa, Relatórios) · **Administração** (Usuários).

- [x] 7.1 Declarar `NavGroupId`, `NAV_GROUPS` e o campo `group` no manifesto compartilhado
- [x] 7.2 Atribuir grupo a cada aba sem reordenar o `PRIMARY_NAV` — a ordem dele governa `firstAllowedRoute` e não pode mudar por motivo estético
- [x] 7.3 Criar `groupedPrimaryNav`, omitindo grupo sem item visível
- [x] 7.4 Renderizar as seções na `Sidebar` com `role="group"` e rótulo, mantendo o drawer mobile
- [x] 7.5 Invariante em teste: achatar as seções devolve exatamente `visiblePrimaryNav` — agrupar não pode virar filtro
- [x] 7.6 Testes: grupo vazio não vira cabeçalho órfão · Administração só para admin · Painel na seção sem rótulo · ordem segue `NAV_GROUPS` · todo grupo declarado existe em `NAV_GROUPS`
- [x] 7.7 Verificação: `nav-manifest.spec` 27/27 · `Sidebar.test` 10/10 · web **197/197** · api **581/581** · `pnpm lint` raiz exit 0
- [x] 7.8 Conferência visual no navegador (desktop e mobile) — feita em 07/08/2026 com sessão autenticada
  - Desktop (1600x900) e drawer mobile (390x844) renderizam **o mesmo** agrupamento: 6 grupos,
    12 itens, na ordem Painel · Manada · Estrutura · Atividades · Análise · Administração.
  - Zero grupo órfão e o grupo do Painel não emite cabeçalho — a regra da 7.3 confere no DOM real,
    não só no teste.

**Decisão registrada:** grupos **não** são recolhíveis. Com no máximo 12 itens tudo cabe na tela, e
recolher exigiria persistir estado entre sessões sem ganho real. Reavaliar se a lista crescer.

**Armadilha encontrada nos testes:** os helpers de usuário da API e do web divergem — o da API deriva
`screenAccess` só das permissions `.read` informadas, o do web declara todas as telas. Por isso o
Organograma (regra `anyOf` legada) aparece com `legendarios.read` num e não no outro. Os dois
comportamentos estão certos; escrevi a expectativa errada duas vezes antes de entender.
