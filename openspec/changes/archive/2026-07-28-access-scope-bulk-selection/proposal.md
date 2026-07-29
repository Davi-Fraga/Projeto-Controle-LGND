## Why

O Controle de Acesso permite associar vários escopos ao mesmo usuário no backend, mas a interface só adiciona um item por vez e não representa a intenção “todos”. Isso torna a configuração de usuários com acesso amplo lenta, sujeita a erro e semanticamente incompleta: copiar todos os IDs existentes não incluiria novos cadastros e pode ser limitado pelos endpoints de opções.

Depois do hardening `access-scope-semantics-hardening`, ausência de escopo passou a significar negação (`fail-closed`). Precisamos preservar essa segurança e distinguir explicitamente três estados por dimensão: sem escopo, itens selecionados e todos os itens — sem transformar o usuário em administrador nem ampliar permissões de telas.

## What Changes

- Introduzir um modo explícito de seleção por tipo de escopo: `MISSING`, `SELECTED` ou `ALL`.
- Persistir `ALL` como política de escopo, e não como uma lista materializada de IDs nem como valor sentinela.
- Adicionar atualização atômica em lote para cada tipo de escopo, com validação integral, idempotência e auditoria antes/depois.
- Permitir selecionar várias igrejas, equipes, TOPs e cidades em uma única edição, usando busca assíncrona, checkboxes e aplicação explícita.
- Oferecer “Todos” por dimensão, incluindo entidades criadas futuramente.
- Definir “Todos os Legendários” como escopo geográfico completo, sem criar um tipo fictício `LEGENDARY`.
- Fazer a resolução de políticas, filtros de listagem e verificações por ID concordarem para `MISSING`, `SELECTED` e `ALL`.
- Calcular `scopeMissing` com base no escopo efetivo, incluindo escopos derivados do papel, e distinguir escopos que satisfazem uma tela de escopos apenas suplementares.
- Manter as permissões de tela independentes do escopo: `ALL` nunca concede tela, papel administrativo, ação de escrita ou acesso a dados sensíveis por si só.
- Preservar o comportamento `fail-closed` do hardening e manter o acesso ao próprio Controle de Acesso exclusivo de `COORDINATION_ADMIN`.
- Reconciliar a change `alinhar-abas-controle-acessos` com a decisão de segurança que mantém “Usuários” fora do catálogo concedível.

## Capabilities

### New Capabilities

- `scope-selection-modes`: semântica persistida e efetiva dos estados `MISSING`, `SELECTED` e `ALL` por dimensão de escopo.
- `bulk-scope-management`: edição em lote e atômica de escopos no backend e na interface do Controle de Acesso.

### Modified Capabilities

Nenhuma capability já sincronizada em `openspec/specs/`. Esta change estende as decisões das changes ativas `access-scope-semantics-hardening` e `controle-acessos-por-usuario`; a implementação só deve começar depois do smoke manual pendente do hardening.

## Impact

- **Banco de dados:** novo estado persistido por usuário e tipo de escopo, com migração/backfill seguro para os escopos atuais.
- **API:** novo contrato atômico para substituir o conjunto de valores de um tipo; contratos de leitura passam a informar modo e escopo efetivo.
- **Autorização:** `AccessPolicyService`, filtros `build*Where`, verificações `assert*Allowed`, dashboard e cálculo de `scopeMissing`.
- **Frontend:** painel de Controle de Acesso, cliente da API, tipos compartilhados e testes de interação.
- **Auditoria:** uma alteração lógica por aplicação, contendo estado anterior e posterior, sem eventos parciais.
- **Compatibilidade:** os registros existentes continuam com semântica `SELECTED`; ausência continua `MISSING`. Endpoints unitários podem ser mantidos temporariamente, mas devem respeitar os mesmos invariantes.
- **Segurança:** `ALL` é limitado à dimensão escolhida e continua subordinado às permissões da tela e das ações.
- **Processo:** nenhuma implementação desta change deve ser misturada à branch/worktree do hardening; primeiro concluir o smoke 9.4 e isolar o trabalho conforme o fluxo do projeto.
