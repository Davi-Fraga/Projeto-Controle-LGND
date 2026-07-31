## 1. Inventário e matriz de permissions

> Resultado completo em **`inventario.md`** (mesma pasta). Decisão de rumo aprovada pelo Davi em
> 31/07/2026: endpoints contextuais (A) onde a busca **expõe pessoas**; `@AnyPermissions` no
> endpoint existente (B) onde o campo escolhe um dirigente dentro de um recurso já administrado.

- [x] 1.1 Inventariar botões, links e `ActionMenu` nas listas e detalhes dos módulos afetados — 32 páginas varridas. **Achado central:** nas 6 listas o botão "criar" é gated, mas os itens do `ActionMenu` (Ver/Editar/Inativar/Excluir) são array literal **sem filtro nenhum**. 4 telas de detalhe (`acoes-sociais/[id]`, `comunicacao/[id]`, `tops/[id]/pre-inscricoes`, `relatorios`) não têm **nenhuma** checagem. `equipes/[id]` e `tops/[id]` já são o padrão correto a generalizar.
- [x] 1.2 Mapear cada controle visual à permission exata do controller correspondente — matriz em `inventario.md` §5. **Dois achados que mudariam o resultado se ignorados:** (a) existe um segundo decorator, `@AnyPermissions` (OR), em `GET`/`PATCH /legendarios/:id` — gate por permission única **esconderia ação legítima** de quem tem `organogram.person.edit`; (b) `legendarios.update` não é declarada por nenhum `@Permissions` isolado. **Bug já localizado:** `equipes/[id]` usa `legendarios.update` sozinho, mais restrito que a própria API.
- [x] 1.3 Inventariar todos os seletores de User, Legendary e Team usados em operações contextuais — `LegendarioCombobox` (→ `/legendarios/options`, exige `legendarios.read`) tem **13 consumidores**; é a origem do 403 em ação autorizada.
- [x] 1.4 Classificar cada seletor entre endpoint compatível, endpoint contextual necessário ou tipo de entidade diferente — classificação completa em `inventario.md` §6. **Dos 6 endpoints propostos no design, 4 sobrevivem**; Equipes-candidatas-em-TOP vira caso B e líder de Igreja vira caso C. ⚠️ **Open question do design resolvida:** `church-form` tem **os dois** campos — `spiritualLeaderUserId` (User) e `spiritualLeaderLegendaryId` (Legendary); não são o mesmo seletor.
- [x] 1.5 Confirmar e documentar os consumidores do endpoint existente de opções de participantes de TOP — **um único consumidor** (`top-families-section.tsx`), já correto: `TopScopeGuard` como escopo autoritativo, `tops.participants.read`, projeção enxuta. **Não mexer.**

## 2. Primitiva de autorização visual

- [ ] 2.1 Criar helper/hook comum de permission efetiva com API tipada
- [ ] 2.2 Criar composição opcional para renderização condicional sem duplicar regra
- [ ] 2.3 Atualizar `ActionMenu` ou seus consumidores para não renderizar menus vazios
- [ ] 2.4 Adicionar testes do helper, ações permitidas/proibidas e links sem permission

## 3. Endpoints contextuais

- [ ] 3.1 Reutilizar contratos existentes que passem no inventário de permission, escopo, elegibilidade e projeção
- [ ] 3.2 Implementar opções de candidatos a membro sob Equipes, se o endpoint global for incompatível
- [ ] 3.3 Implementar/reutilizar opções de candidatos a participantes e servos sob TOP
- [ ] 3.4 Implementar/reutilizar opções de Equipes candidatas sob TOP
- [ ] 3.5 Implementar opções de candidatos a participantes sob Ações Sociais
- [ ] 3.6 Implementar ou preservar separadamente opções de User e Legendary em Igrejas conforme o campo real
- [ ] 3.7 Validar permission da ação e escopo do recurso-pai em cada endpoint
- [ ] 3.8 Aplicar busca limitada, ordenação determinística, elegibilidade e projeção mínima sem PII
- [ ] 3.9 Adicionar testes de `403`, `404`, candidatos inelegíveis, pai externo e contrato mínimo

## 4. Ações nas telas

- [ ] 4.1 Aplicar permissions granulares às ações de Legendários
- [ ] 4.2 Aplicar permissions granulares às ações de Equipes e membros
- [ ] 4.3 Aplicar permissions granulares às ações de Igrejas
- [ ] 4.4 Aplicar permissions granulares às ações principais de TOP
- [ ] 4.5 Aplicar permissions granulares a participantes, servos, equipes, famílias e pré-inscrições de TOP
- [ ] 4.6 Aplicar permissions granulares a Ações Sociais e participantes
- [ ] 4.7 Aplicar permissions granulares a Comunicação e destinatários
- [ ] 4.8 Aplicar permissions granulares aos controles de exportação de Relatórios
- [ ] 4.9 Condicionar links cruzados à permission da tela de destino

## 5. Formulários e comboboxes

- [ ] 5.1 Conectar formulários de Equipes aos contratos contextuais aprovados
- [ ] 5.2 Conectar formulários de TOP aos contratos contextuais aprovados
- [ ] 5.3 Conectar formulários de Ações Sociais aos contratos contextuais aprovados
- [ ] 5.4 Conectar formulários de Igrejas preservando a distinção entre User e Legendary
- [ ] 5.5 Reutilizar `LegendarioCombobox`/`AsyncCombobox` com debounce, loading, vazio e proteção anti-race
- [ ] 5.6 Remover dependências acidentais de `legendarios.read` ou `teams.read` quando o contrato contextual autorizar a operação

## 6. Verificação integrada

- [ ] 6.1 Executar testes focados dos endpoints contextuais e services afetados
- [ ] 6.2 Executar testes web de listas, detalhes, sub-recursos, menus e formulários
- [ ] 6.3 Executar `pnpm --filter api test` e `pnpm --filter web test`
- [ ] 6.4 Executar `pnpm -r lint` e `pnpm --filter api build`
- [ ] 6.5 Fazer smoke com VIEW, EDIT parcial, EDIT completo e admin em todos os módulos afetados
- [ ] 6.6 Confirmar que chamadas manuais continuam recebendo `403/404` mesmo com controles escondidos
- [ ] 6.7 Executar `openspec.cmd validate acoes-web-e-seletores-contextuais`
