## Context

O sistema separa permission de ação (`PermissionsGuard`) e recorte de dados (`AccessPolicyService`). As listagens principais de Equipes, TOPs, Igrejas, Legendários e Ações Sociais já resolvem o usuário e aplicam builders escopados, mas parte das operações por ID recebe somente `user.sub` para auditoria e busca a entidade sem escopo. Há ainda consumidores auxiliares — sugestões, opções, pré-inscrições e relatórios — que não seguem a mesma política.

O modelo efetivo distingue `MISSING`, `SELECTED` e `ALL` por dimensão, além de vínculos derivados. `COORDINATION_ADMIN` é o único administrador irrestrito. A implementação deve preservar essas semânticas, o soft delete e a auditoria existentes, sem criar uma segunda policy em controllers.

## Goals / Non-Goals

**Goals:**

- Garantir que leitura, detalhe, mutação, opções, contadores e exportação usem a mesma política efetiva.
- Impedir IDOR por identificador conhecido, retornando `404` fora do escopo nos recursos endurecidos.
- Fazer `ALL` e vínculos derivados funcionarem nas mesmas operações em que `SELECTED` funciona.
- Reduzir respostas auxiliares ao mínimo necessário.
- Fechar a geração administrativa de reset por papel.
- Cobrir as regras críticas com uma matriz negativa de autorização.

**Non-Goals:**

- Não alterar papéis, permissions concedíveis ou o schema Prisma.
- Não redesenhar a navegação ou esconder ações no frontend; isso pertence aos changes subsequentes.
- Não conceder escopo automaticamente nem transformar `MISSING` em `ALL`.
- Não mudar regras de negócio de criação administrativa de entidades de topo.
- Não expor `403` no lugar de `404` quando isso confirmar que um recurso externo existe.

## Decisions

### 1. Services recebem o usuário autenticado completo

Operações escopáveis receberão `AuthenticatedUser`; o service resolverá `AccessScope` e usará `user.sub` apenas como ator da auditoria. Controllers continuarão finos.

**Alternativa rejeitada — validar escopo no controller:** duplicaria regra de negócio e permitiria que outra chamada interna contornasse a autorização.

### 2. Filtro e assert compartilham a mesma semântica

`AccessPolicyService` fornecerá ou consolidará helpers por dimensão que entendam `MISSING`, `SELECTED`, `ALL` e derivados. Operações por ID validarão o pai antes de qualquer escrita:

- Equipe antes de editar equipe ou membresia;
- Ação Social antes de editar ação ou participante;
- TOP antes de operar pré-inscrição;
- cidade do TOP/Ação Social antes de produzir relatório.

Quando possível, a existência será resolvida em uma consulta `findFirst` já escopada. Quando a entidade for carregada para auditoria, um assert canônico validará a dimensão antes da mutação. O resultado fora do escopo será `404`.

**Alternativa rejeitada — checar `ids.includes` em cada service:** já falhou para `allTeams` e voltaria a divergir dos builders.

### 3. Sugestões de voluntários usam escopo e projeção mínima

`GET /social-actions/volunteers/suggestions` receberá o usuário corrente, aplicará `buildLegendaryWhere` e usará `select` explícito. O contrato poderá conter somente identificador, nome, número LGND e rótulos estritamente necessários ao seletor. Email, telefone, nascimento, endereço, notas e o objeto Prisma completo não serão retornados.

### 4. Pré-inscrição herda o TOP

Rotas com `topEventId` usarão o guard de TOP e manterão defesa no service. Rotas que recebem apenas o ID da pré-inscrição carregarão seu `topEventId` e validarão o TOP antes de retornar ou alterar. Listagens e contadores filtrarão pela relação com TOPs permitidos.

### 5. Relatórios obedecem ao escopo CITY declarado

O `SCREEN_CATALOG` declara Relatórios com `CITY`; portanto:

- agregações de Igreja e Equipe contarão Legendários permitidos pela geografia;
- relatórios por TOP validarão `TopEvent.city`;
- relatórios por Ação Social validarão `SocialAction.city`;
- pendências aplicarão o recorte por relações até o TOP/Legendário;
- exports reutilizarão as mesmas consultas da leitura.

Grupos sem qualquer registro visível não serão retornados quando seu nome revelar uma entidade fora da geografia. Não será exigido `TOP`, `TEAM` ou `CHURCH` apenas para tornar a tela Relatórios utilizável.

**Alternativa rejeitada — ampliar `scopeTypes` de Relatórios:** mudaria o produto e poderia fazer uma dimensão suplementar liberar conjuntos não pretendidos.

### 6. Opções de TOP usam a policy de TOP

`TopsService.options` receberá o usuário e aplicará `buildTopWhere`. A projeção continuará mínima. Seletores próprios de Relatórios não reutilizarão esse endpoint se precisarem de semântica CITY; deverão usar um contrato escopado pelo domínio consumidor.

### 7. Reset administrativo é role-gated

A geração de link usará `JwtAuthGuard` + `RolesGuard` + `@Roles(COORDINATION_ADMIN)`. `users.update` residual não autorizará a operação. Validação e consumo do token permanecem públicos e sujeitos ao rate limit global.

### 8. Testes formam uma matriz comum

Cada dimensão exercitada terá cenários para:

- permission ausente;
- `MISSING`;
- `SELECTED` dentro e fora do escopo;
- `ALL`;
- vínculo derivado quando aplicável;
- ID externo conhecido;
- mesma autorização entre leitura e exportação.

Os testes existentes de caminho feliz serão preservados, mas mocks de usuário passarão a fornecer `AuthenticatedUser` e `AccessScope`.

## Risks / Trade-offs

- **[Assinaturas de services mudam em muitos testes]** → migrar por módulo e manter `user.sub` derivado dentro do service.
- **[404 pode alterar expectativa de clientes]** → documentar como hardening intencional e testar o contrato.
- **[Filtros relacionais de relatórios podem ficar complexos]** → criar helpers pequenos, validar SQL gerado por Prisma e evitar consultas nativas.
- **[A projeção mínima quebrar consumidor que usava campo indevido]** → inventariar o tipo consumido no web antes de reduzir e adicionar teste de contrato.
- **[Escopo verificado antes e entidade alterada em seguida]** → manter a mutação imediatamente após a validação e usar transação quando a operação já exigir unidade atômica.

## Migration Plan

1. Implementar e testar helpers canônicos no `AccessPolicyService`.
2. Endurecer Equipes e corrigir `TEAM=ALL`.
3. Endurecer Ações Sociais e reduzir sugestões.
4. Endurecer Pré-inscrições e opções de TOP.
5. Alinhar Relatórios à geografia.
6. Tornar reset administrativo role-gated.
7. Executar testes focados, suíte API completa, lint e build da API.
8. Fazer smoke com admin, `MISSING`, `SELECTED`, `ALL`, derivado e ID externo.

Não há migration de banco. O deploy da API é retrocompatível para chamadas autorizadas. Rollback de código restaura o comportamento anterior sem transformação de dados.

## Open Questions

Nenhuma questão de produto bloqueante. Durante a implementação deve-se apenas confirmar quais campos da sugestão de voluntários são efetivamente renderizados para fixar a projeção mínima.
