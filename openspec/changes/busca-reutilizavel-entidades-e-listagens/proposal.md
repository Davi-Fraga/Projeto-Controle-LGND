## Why

Seletores que carregam listas completas de Legendários e outros cadastros ficaram impraticáveis e alguns fluxos ainda exigem UUID manual. O projeto já possui um `AsyncCombobox` e `GET /legendarios/options`, mas o padrão está incompleto, duplicado em adaptadores locais e ainda não cobre as listagens de Igrejas e Líderes Espirituais nem todas as garantias de acessibilidade e escopo.

## What Changes

- Evoluir o combobox assíncrono existente como componente reutilizável e acessível, com debounce, proteção contra respostas obsoletas, navegação por teclado, estados de carregamento/vazio/erro, preservação do valor atual e limpeza configurável.
- Criar um adaptador canônico de seleção de Legendário sobre `GET /legendarios/options`, buscando por nome normalizado e número LGND, com resultados limitados e sempre filtrados pelo `AccessPolicyService`.
- Eliminar a duplicação já existente entre o formulário de usuário e o convite, fazendo ambos consumirem o adaptador canônico.
- Adicionar busca no backend às abas Igrejas e Líderes Espirituais, com debounce e proteção anti-race no frontend.
- Fazer a busca de Igrejas considerar nome canônico e `ChurchAlias.normalizedAlias`, reutilizando a normalização existente.
- Corrigir a listagem `GET /churches` para aplicar o escopo do usuário antes de pesquisar ou retornar resultados; o endpoint de Líderes Espirituais preserva o escopo que já aplica hoje.
- Registrar o inventário completo dos pontos que selecionam Legendário ou entidades relacionadas e sequenciar a migração de cada grupo em changes posteriores, sem tentar migrar todos os fluxos neste change.
- Preservar o teste de regressão da busca de Legendários que impede uma cláusula de telefone vazia de fazer uma busca textual retornar todos os registros.

## Capabilities

### New Capabilities
- `church-list-search`: busca escopada por nome canônico ou alias na aba Igrejas e busca escopada por nome de líder/igreja na aba Líderes Espirituais.
- `entity-search-inventory`: contrato de inventário e migração sequenciada dos seletores de entidades que ainda carregam listas completas ou aceitam UUID manual.

### Modified Capabilities
- `legendario-autocomplete`: amplia o padrão existente com busca por número LGND, escopo obrigatório, valor atual, limpeza configurável, acessibilidade completa por teclado e um adaptador único reutilizável.

## Impact

- **Web**: `apps/web/src/components/ui/AsyncCombobox.tsx`, novo adaptador em `apps/web/src/features/legendarios`, formulários de usuário/convite e páginas de Igrejas/Líderes Espirituais.
- **API**: reutilização de `GET /api/legendarios/options`; evolução de `GET /api/churches` e `GET /api/churches/spiritual-leaders` para aceitar busca e aplicar escopo consistentemente.
- **Dados**: provável coluna normalizada para nome de igreja, com migration e backfill, permitindo busca parcial sem acento; aliases existentes continuam em `ChurchAlias.normalizedAlias`.
- **Segurança**: nenhuma busca pode ampliar visibilidade. A listagem geral de Igrejas hoje não usa `AccessPolicyService` e será alinhada ao endpoint escopado de Líderes Espirituais.
- **Compatibilidade**: respostas existentes de Igrejas permanecem compatíveis; parâmetros de busca são opcionais. Migrações dos demais seletores serão entregues em changes menores por domínio.
