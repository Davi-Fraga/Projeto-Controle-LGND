## Context

O frontend Next.js/Tailwind possui uma identidade visual consolidada em preto, tons de zinc e laranja, mas a implementação distribui valores de cor, tamanho, borda e estados por layouts, componentes e páginas. A auditoria funcional/visual em desktop e mobile encontrou boa coerência geral, ao mesmo tempo em que evidenciou texto auxiliar pequeno, excesso de delimitações, foco inconsistente e um menu mobile cujo botão não possuía nome acessível e ficava bloqueado pelo backdrop ao abrir.

A mudança é transversal ao frontend e deve ser incremental. Ela não pode alterar o manifesto de navegação, `screenAccess`, guards, escopos, contratos de API ou regras de domínio. O objetivo é dar uma fundação comum para evoluir telas existentes sem uma reescrita visual única e arriscada.

## Goals / Non-Goals

**Goals:**

- preservar e aprimorar a identidade escura/laranja da Central da Manada;
- consolidar tokens semânticos, escala tipográfica, espaçamento, superfícies e estados interativos;
- tornar componentes compartilhados acessíveis por teclado, toque e tecnologia assistiva;
- melhorar reflow e densidade de dashboard, filtros, tabelas, formulários, mapa e organograma;
- padronizar carregamento, vazio, erro e sucesso;
- permitir adoção gradual, validada por testes e screenshots de referência.

**Non-Goals:**

- criar tema claro nesta mudança;
- trocar a marca, o laranja principal ou o conceito visual robusto do produto;
- alterar autorização, navegação efetiva, APIs, banco ou Prisma;
- migrar todas as telas em um único lote;
- adicionar biblioteca externa de componentes sem uma necessidade demonstrada;
- redesenhar visualizações de dados especializadas que já funcionam, como Leaflet e React Flow.

## Decisions

### 1. Tokens semânticos em CSS como fonte visual

Serão definidos tokens CSS para canvas, superfícies, texto, bordas, destaque, foco e feedback. Tailwind continuará sendo usado para composição, referenciando os tokens por classes utilitárias ou classes semânticas compartilhadas.

**Racional:** CSS variables permitem migração incremental e estados dinâmicos sem introduzir dependência. Também reduzem a divergência entre valores crus equivalentes.

**Alternativa considerada:** substituir Tailwind por uma biblioteca ou theme provider. Rejeitada por custo, risco e ausência de necessidade funcional.

### 2. Escala curta e documentada

A tipografia será organizada em poucos papéis: título de página, título de seção, corpo operacional, auxiliar e rótulo. Espaçamento seguirá uma escala baseada em incrementos recorrentes, com redução responsiva apenas nos níveis maiores.

**Racional:** uma escala curta melhora ritmo e manutenção sem retirar a densidade necessária a um sistema administrativo.

**Alternativa considerada:** aumentar globalmente todos os textos. Rejeitada porque prejudicaria tabelas, painéis e visualizações densas.

### 3. Componentes compartilhados antes de migração de páginas

Botões, campos, superfícies, cabeçalhos de página, estados assíncronos, menus e modais serão ajustados ou criados em `components/ui` e `components/layout` antes de substituir padrões locais nas páginas.

**Racional:** corrigir a fundação evita repetir variantes e permite migrar domínios por prioridade.

### 4. Migração por ondas

A adoção ocorrerá em quatro ondas:

1. shell, navegação, foco, tokens e componentes básicos;
2. dashboard, login e estados de feedback;
3. listas, filtros, tabelas e formulários;
4. superfícies densas e especializadas: acessos, relatórios, mapa e organograma.

Cada onda deve terminar com testes focados, lint/type-check e QA visual desktop/mobile antes de começar a seguinte.

### 5. Acessibilidade como contrato observável

Controles apenas com ícone receberão nomes acessíveis; toggles comunicarão estado; foco visível não será removido sem substituição; alvos de toque e reflow serão verificados em viewports fixos. `prefers-reduced-motion` controlará animações decorativas.

**Racional:** esses critérios podem ser automatizados parcialmente e inspecionados visualmente, reduzindo regressões subjetivas.

### 6. QA visual baseado em estados, não apenas páginas

A matriz mínima cobrirá 1600x900 e 390x844, incluindo estado inicial, densidade realista, menu/modal aberto, pós-interação, vazio, carregamento e erro quando aplicável. Screenshots de viewport serão evidência; métricas de overflow apenas complementam a inspeção.

## Risks / Trade-offs

- **[Migração parcial gera aparência híbrida]** → migrar por ondas completas de componentes e documentar claramente o estágio atual.
- **[Tokens demais recriam valores crus com outros nomes]** → limitar tokens a papéis semânticos estáveis e revisar duplicidades antes de expandir.
- **[Aumento de texto reduz densidade operacional]** → usar escala por papel, validar telas densas e evitar aumento global indiscriminado.
- **[Refatoração visual quebra comportamento]** → preservar props e contratos, adicionar testes de interação antes de trocar apresentação.
- **[Screenshots ficam frágeis com dados variáveis]** → validar estados e regiões estáveis, usando dados locais controlados quando necessário.
- **[Mapa e organograma não seguem todos os tokens]** → limitar a migração ao shell, controles e painéis ao redor; cores de dados permanecem específicas.

## Migration Plan

1. Inventariar valores visuais e componentes compartilhados atuais.
2. Definir tokens, escala e guia de uso sem remover estilos existentes.
3. Migrar shell e componentes básicos com compatibilidade visual temporária.
4. Migrar telas por onda, removendo valores antigos somente após validação.
5. Executar testes web, lint/type-check e QA Playwright em cada onda.
6. Reverter uma onda restaurando os componentes afetados; tokens não utilizados podem permanecer sem impacto durante rollback parcial.

## Open Questions

- Quais telas devem servir como referências visuais definitivas de cada onda: dashboard e legendários, ou dashboard e controle de acessos?
- A densidade de tabelas deve ser fixa ou oferecer preferência confortável/compacta numa mudança posterior?
- O guia visual ficará apenas em documentação Markdown ou também haverá uma rota interna de catálogo de componentes?
