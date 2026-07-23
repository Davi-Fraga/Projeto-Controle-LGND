## Context

O `CurrentUser` já contém permissions efetivas e algumas áreas, como Famílias de TOP, condicionam ações corretamente. Outras listas e detalhes renderizam Editar, Inativar, Excluir, Enviar, Exportar ou gestão de participantes sem conferir a permission da operação. O backend continua podendo negar, mas a interface oferece caminhos mortos.

Há um segundo problema: formulários de Equipes, Igrejas, TOPs e Ações Sociais usam endpoints globais de opções protegidos pela permission de leitura da tela de origem. Um usuário pode possuir a permission específica para editar o recurso-pai e ainda receber `403` no seletor.

## Goals / Non-Goals

**Goals:**

- Tornar toda ação visual coerente com sua permission efetiva.
- Reutilizar uma primitiva comum em vez de condicionais ad hoc.
- Fazer operações concedidas funcionarem sem exigir acesso à tela global da entidade selecionada.
- Limitar opções contextuais por permission, escopo do pai, regra de elegibilidade e projeção mínima.
- Preservar `LegendarioCombobox` e `AsyncCombobox`.

**Non-Goals:**

- Não considerar a UI uma barreira de segurança.
- Não ampliar detalhes de Legendários ou Equipes ao conceder uma ação contextual.
- Não substituir endpoints globais para consumidores que já possuem a permission correta.
- Não carregar coleções completas, aceitar UUID manual ou criar outro componente de autocomplete.
- Não misturar `User` e `Legendary`; `spiritualLeaderUserId` continua usando usuários elegíveis.

## Decisions

### 1. Primitiva comum para permission efetiva

Será criado um helper/hook reutilizável, por exemplo `useCan(permission)` e uma composição opcional `<Can permission="...">`. Ele lerá apenas as permissions efetivas do `CurrentUser`.

As páginas montarão arrays de `ActionMenu` já filtrados. Se nenhuma ação restar, o menu não será renderizado. Links e botões proibidos serão escondidos, não apenas desabilitados, para não sugerir uma capacidade inexistente.

**Alternativa rejeitada — verificar papel no componente:** papéis não representam as permissions concedidas por tela, exceto as exceções administrativas explícitas.

### 2. Mapear cada ação à permission exata

O inventário abrangerá:

- Legendários: editar, histórico, inativar/restaurar;
- Equipes: editar e gestão de membros;
- Igrejas: editar e operações administrativas;
- TOPs: editar e sub-recursos de participantes, servos, equipes, famílias e pré-inscrições;
- Ações Sociais: editar, concluir, cancelar e participantes;
- Comunicação: editar, enviar, cancelar e destinatários;
- Relatórios: exportações gerais e de contatos.

Create/delete/restore administrativos continuarão visíveis somente quando a permission efetiva correspondente existir. O padrão validado em Famílias de TOP será generalizado.

### 3. Inventário antes de criar endpoints

Cada seletor será classificado:

1. endpoint existente já possui permission e escopo compatíveis: reutilizar;
2. endpoint existente expõe um conjunto mais amplo ou exige tela alheia: criar contrato contextual;
3. campo seleciona `User`, não `Legendary`: preservar contrato de usuários elegíveis.

Isso evita duplicar `/legendarios/options` ou o endpoint já existente de participantes de TOP.

### 4. Endpoints contextuais vivem sob o recurso-pai

Contratos candidatos:

```text
GET /teams/:teamId/member-candidates/options
GET /tops/:topId/participant-candidates/options
GET /tops/:topId/servant-candidates/options
GET /tops/:topId/team-candidates/options
GET /social-actions/:id/participant-candidates/options
GET /churches/:churchId/leader-candidates/options
```

O inventário poderá eliminar ou renomear endpoints, mas não poderá substituir o princípio:

- permission é a da ação de destino;
- o pai é validado pelo escopo antes da busca;
- busca é paginada, limitada e com projeção mínima;
- resposta usa o contrato de opção compartilhado;
- o endpoint não concede acesso ao detalhe da entidade candidata.

### 5. Elegibilidade é específica do contexto

- TOP e Ação Social restringem candidatos geográficos pela cidade do pai.
- Igreja restringe candidato Legendário pela cidade/igreja coerente com o vínculo; `spiritualLeaderUserId` permanece em seu endpoint de User.
- Equipe pode buscar Legendários ativos em diretório mínimo porque `teams.members.add` exige identificar quem será adicionado; a resposta conterá somente ID, nome e número LGND, com busca e limite. Isso não autoriza abrir o perfil.
- Equipe candidata para um TOP retorna somente ID/nome/status necessário à vinculação.
- Registros já vinculados, inativos ou inelegíveis serão excluídos conforme a regra da operação.

Para contextos sem regra segura definida, a implementação deve parar e ajustar a spec, não reutilizar silenciosamente uma listagem global.

### 6. Backend mantém a defesa

Mesmo com o botão escondido, os endpoints de mutação e opções exigirão guards, permission exata e escopo do pai. Falta de permission retorna `403`; pai fora do escopo retorna `404`. Respostas nunca incluirão email, telefone, nascimento, notas ou objetos Prisma completos.

### 7. Testes combinam componente e contrato

Testes web provarão ausência/presença das ações e que menus vazios desaparecem. Testes API provarão permission, escopo, elegibilidade, paginação e projeção mínima dos endpoints contextuais.

## Risks / Trade-offs

- **[Grande quantidade de componentes tocados]** → inventário por domínio e aplicação incremental com testes focados.
- **[Permission incorreta esconder ação legítima]** → derivar o mapa do `SCREEN_CATALOG`/controllers e testar VIEW versus EDIT.
- **[Diretório contextual ampliar descoberta de pessoas]** → projeção mínima, permission de ação, busca limitada e nenhuma navegação ao perfil.
- **[Duplicação de opções]** → reutilizar `AsyncCombobox`, DTOs e endpoints compatíveis antes de criar outro contrato.
- **[Endpoint contextual ficar acoplado ao web]** → nomear pela operação de domínio e manter regra no service.
- **[Estado da sessão ficar visualmente atrasado]** → backend continua autoritativo e o web atualiza `CurrentUser` após refresh.

## Migration Plan

1. Inventariar ações e seletores e fechar a matriz permission→controle.
2. Criar helper de permission e migrar primeiro um domínio de referência.
3. Criar/reutilizar endpoints contextuais com testes de API.
4. Migrar Equipes, Igrejas, TOPs, Ações Sociais, Comunicação e Relatórios.
5. Executar testes web/API, lint e smoke com VIEW, EDIT parcial e admin.

Não há migration de banco. O rollout pode ser incremental desde que o endpoint contextual entre antes do formulário que o consome. Rollback restaura apenas a experiência anterior; guards do backend permanecem.

## Open Questions

Nenhuma questão bloqueante para os contratos. O inventário inicial deve confirmar se o campo de líder de Igreja em cada formulário representa `User` ou `Legendary`, evitando tratar `spiritualLeaderUserId` como Legendário.
