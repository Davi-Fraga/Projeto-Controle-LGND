## Why

O backend pode negar corretamente uma ação, mas várias telas ainda exibem botões que o usuário não possui permission para executar. Além disso, formulários autorizados dependem de endpoints de opções protegidos pela permission de outra tela, produzindo ações visíveis que falham com `403`.

## What Changes

- Criar uma primitiva reutilizável de autorização visual baseada nas permissions efetivas do usuário.
- Condicionar ações de criação, edição, exclusão, envio, exportação e gestão de sub-recursos à permission exata.
- Aplicar a regra às listas, detalhes e componentes internos de Legendários, Equipes, Igrejas, TOPs, Ações Sociais, Comunicação e Relatórios.
- Não renderizar menus de ação vazios nem oferecer links para rotas proibidas.
- Inventariar os seletores embutidos e reutilizar contratos existentes quando a permission e o escopo já forem compatíveis.
- Criar endpoints contextuais mínimos para candidatos quando a operação de destino é autorizada, mas a tela global de Legendários ou Equipes não é.
- Validar a entidade-pai e seu escopo antes de buscar opções contextuais.
- Preservar `LegendarioCombobox`/`AsyncCombobox` como componentes canônicos; não carregar coleções completas nem pedir UUID manual.
- Manter o backend como autoridade mesmo quando a ação estiver escondida.

## Capabilities

### New Capabilities

- `permission-aware-actions`: visibilidade consistente de ações e links conforme a permission efetiva exata.
- `contextual-entity-options`: opções mínimas e escopadas autorizadas pelo contexto da operação, sem exigir acesso à tela global da entidade.

### Modified Capabilities

Nenhuma spec canônica é removida. `legendario-autocomplete` permanece válido para consumidores que já possuem `legendarios.read`; os novos contratos cobrem operações contextuais com outra permission de domínio.

## Impact

- Web: páginas, menus, formulários e tabelas dos módulos administrativos; novo helper/componente de autorização visual.
- API: endpoints contextuais nos módulos de Equipes, TOPs e Igrejas, conforme inventário final.
- Compartilhado: tipos mínimos de opção apenas se necessários para evitar contratos duplicados.
- Testes: ausência de ações sem permission, presença com permission e segurança dos endpoints contextuais.
- Banco: nenhuma migration prevista.
