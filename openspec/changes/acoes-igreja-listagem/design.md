## Context

A listagem de Igrejas está atrás das demais telas: não tem o menu de ações por linha já padronizado no sistema. Editar já existe; faltam a visão de detalhes (com membros) e uma exclusão segura. Após a importação dos 226, conferir vínculos reais Legendário↔Igreja antes de permitir exclusão é pré-requisito. A barreira real de segurança é o backend.

## Goals / Non-Goals

**Goals**
- Menu de ações por linha (Editar / Ver / Excluir) no padrão das outras telas.
- Detalhes com a lista de membros Legendários da igreja.
- Exclusão permitida só para igreja vazia, validada no backend, sem cascata.

**Non-Goals**
- Não alterar o fluxo de edição existente além de acioná-lo pelo menu.
- Não permitir exclusão em cascata de Legendários.
- Não mexer em permissões/escopo, auth, CORS, refresh token, Prisma bootstrap ou config global.

## Decisions

### Validação de igreja vazia no backend
A regra "só exclui se vazia" mora no `ChurchesService`: contar Legendários vinculados antes de excluir e recusar com erro de domínio tratado (mapeado para o filtro de erro padrão) quando houver vínculos. O frontend reflete a mensagem mas não é a barreira. Garante proteção mesmo contra chamada direta à API.

### Reuso do menu de ações padrão
Reaproveitar o componente/padrão de menu de ações já usado nas outras telas (ex.: Legendários), mantendo consistência visual e de comportamento, sem inventar um segundo padrão.

### Detalhes: tela ou modal
Detalhes podem ser modal ou rota dedicada — seguir o que as telas equivalentes já fazem. Inclui dados da igreja + lista de Legendários vinculados (reusando o endpoint de membros, se já existir, ou expondo a relação).

### Sem cascata
A exclusão nunca remove Legendários. Confirma-se que a relação no Prisma não está configurada para apagar Legendários junto; a regra de bloqueio cobre o caso de negócio.

## Risks / Trade-offs

- **Operação destrutiva (excluir)**: principal risco; mitigada por validação no backend + confirmação no frontend. Excluir só vazia evita perda de vínculo.
- **Divergência de contagem**: a contagem de membros deve refletir vínculos ativos/reais — alinhar com como o resto do sistema conta Legendários de uma igreja.
- **Reuso vs. duplicação**: usar o padrão de ações/detalhes existente para não criar caminho paralelo.

## Migration Plan

Sem migração de banco — usa o model `Church` e a relação com `Legendary` já existentes. Implementação incremental: backend (detalhes + exclusão protegida) com testes, depois UI (menu, detalhes, confirmação, erro). Reversível.

## Open Questions

- Detalhes em modal ou rota dedicada — qual padrão as telas equivalentes seguem hoje?
- Já existe endpoint que retorna os Legendários de uma igreja, ou é preciso expor essa relação para a tela de detalhes?
- O que conta como "vinculado" para bloquear exclusão: qualquer `Legendary` com `churchId`, considerando soft delete?
