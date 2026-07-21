## ADDED Requirements

### Requirement: Permissões granulares do módulo reconciliadas com o SCREEN_CATALOG

O módulo SHALL expressar autorização granular **dentro do modelo de acesso por tela existente** (`SCREEN_CATALOG` + níveis NONE/VIEW/EDIT + `UserScope`), sem criar um mecanismo paralelo. A tela `org-chart` SHALL mapear as permissões `organogram.*`, e o modelo de tela SHALL ser estendido para suportar **toggles de ação** concedidos além do EDIT, permitindo distinguir editar de mover. O conjunto mínimo de permissões SHALL ser:

- `organogram.read` — nível **VIEW** da tela (entrar, navegar, ver detalhe da pessoa);
- `organogram.person.edit` — nível **EDIT** da tela (editar dados cadastrais da pessoa);
- `organogram.group.reorder` — **toggle de ação**: reordenar/arrastar dentro de subdivisão ≤10;
- `organogram.group.move` — **toggle de ação**: mover pessoa entre grupos (mudança de vínculo);
- `organogram.structure.change` — **toggle de ação**: mudança estrutural crítica na macro.

As **abas** (Equipes/Coordenadores/Cidades/TOPs) NÃO SHALL ser permissões: sua visibilidade SHALL derivar do **escopo de dados** do usuário (`UserScope`/`AccessPolicyService`) — quem tem escopo de cidade vê a aba Cidades, quem tem escopo de equipe vê a aba Equipes, e assim por diante. Administrar quem acessa o módulo SHALL continuar sendo função da tela **Controle de Acessos** existente, não uma permissão própria do organograma.

#### Scenario: Sem a tela no nível VIEW não há módulo

- **WHEN** um usuário sem `organogram.read` (tela não concedida) tenta acessar o Organograma
- **THEN** a tela não aparece no menu e o acesso direto é recusado (403) no backend

#### Scenario: Aba visível conforme o escopo de dados

- **WHEN** um usuário tem escopo de cidade mas não de equipe
- **THEN** vê a aba Cidades e não vê a aba Equipes; chamar a API de Equipes diretamente é recusado pelo escopo

#### Scenario: Editar sem mover é concedível

- **WHEN** o admin concede a tela org-chart em EDIT (`organogram.person.edit`) sem o toggle `organogram.group.move`
- **THEN** o usuário edita dados cadastrais, mas mover/transferir é recusado (403) no backend

### Requirement: Separação entre visibilidade, interação e persistência

A spec SHALL separar três planos: (1) **visibilidade** — o que a UI mostra; (2) **capacidade de interação** — o que a UI permite tentar; (3) **autorização real de persistência** — o que o backend aceita gravar. O frontend SHALL refletir permissões (ocultar/desabilitar), mas a segurança real SHALL ser validada no backend em **todas** as operações. Ocultar um botão NÃO SHALL ser considerado controle de acesso.

#### Scenario: Backend valida mesmo com UI ocultando

- **WHEN** qualquer ação (editar/mover/reordenar/mudança estrutural) é chamada diretamente na API sem a permissão correspondente
- **THEN** o backend recusa (403), independentemente do que a UI exibia

#### Scenario: UI reflete permissão consistentemente

- **WHEN** o usuário não tem uma permissão de ação
- **THEN** a ação correspondente é ocultada ou desabilitada de forma consistente em card, painel lateral e menu contextual

### Requirement: Menor privilégio e escopo mínimo por ação

O módulo SHALL adotar menor privilégio: cada ação exige exatamente a permissão e o escopo mínimos necessários, e a ausência de permissão SHALL fechar o acesso (fail-closed), nunca abri-lo por omissão.

#### Scenario: Ausência de permissão fecha o acesso

- **WHEN** uma permissão não foi concedida a um usuário
- **THEN** a ação e/ou os dados correspondentes ficam indisponíveis por padrão

#### Scenario: Ação exige escopo além da permissão funcional

- **WHEN** o usuário tem `organogram.group.move` mas o destino está fora do seu escopo de dados
- **THEN** a movimentação é recusada — a permissão funcional não supera o escopo

### Requirement: Comunicação clara de restrição de acesso

A interface SHALL comunicar restrições sem confundir o usuário, distinguindo os estados **sem acesso** (não pode abrir), **somente-leitura** (vê mas não age) e **ação bloqueada** (poderia agir, mas não neste caso — ex.: destino cheio, fora do escopo). Restrições SHALL usar tooltip/mensagem explicando o motivo, sem expor dados ou ações além do autorizado.

#### Scenario: Ação bloqueada explica o motivo

- **WHEN** uma ação está desabilitada por permissão ou regra
- **THEN** um tooltip/mensagem explica por que não é possível, sem revelar informação fora do escopo

#### Scenario: Estados distintos não se confundem

- **WHEN** o usuário encontra sem-acesso, somente-leitura ou ação-bloqueada
- **THEN** cada estado é comunicado de forma distinta e compreensível

### Requirement: Governança e auditoria de perfis elevados

Perfis com privilégio elevado (ex.: administração) SHALL ter governança ampliada (confirmar mudanças estruturais críticas), mas SHALL permanecer rastreáveis: suas ações críticas SHALL ser auditadas. Somente quem tiver o toggle `organogram.structure.change` SHALL confirmar mudanças estruturais críticas. Administrar quem tem acesso ao módulo SHALL ser feito pela tela **Controle de Acessos** existente (não por permissão própria do organograma).

#### Scenario: Só privilégio elevado confirma mudança crítica

- **WHEN** uma mudança estrutural crítica é submetida por usuário sem `organogram.structure.change`
- **THEN** a confirmação é recusada no backend

#### Scenario: Ação de admin é rastreável

- **WHEN** um administrador executa uma mudança estrutural crítica
- **THEN** a ação é registrada em auditoria com autor, alvo e horário

### Requirement: Camadas de autorização com responsabilidades separadas

A autorização do módulo SHALL ser modelada em camadas distintas e cumulativas, sem misturar responsabilidades: (1) **nível de tela** — `org-chart` em VIEW (`organogram.read`) ou EDIT (`organogram.person.edit`); (2) **escopo de dados e abas visíveis** — resolvido pelo `AccessPolicyService`/`UserScope`, que NÃO SHALL ser permissão e que também determina **quais abas** aparecem; (3) **toggles de ação** — `organogram.group.reorder`, `organogram.group.move`, `organogram.structure.change`, concedidos além do EDIT. Uma operação só SHALL ocorrer se satisfizer todas as camadas aplicáveis. A visibilidade de aba NÃO SHALL ser codificada como permissão, e nenhum toggle de ação SHALL superar o escopo de dados.

#### Scenario: Camadas são cumulativas

- **WHEN** um usuário tem a tela org-chart em EDIT e o toggle `organogram.group.move`, mas o alvo está fora do seu `UserScope`
- **THEN** a ação é recusada pela camada de escopo, mesmo com nível de tela e toggle satisfeitos

#### Scenario: Escopo de dados nunca é permissão

- **WHEN** o sistema decide quais cidades/equipes/TOPs retornar e quais abas exibir
- **THEN** essa decisão vem do `AccessPolicyService`/`UserScope`, e não de nenhuma permissão `organogram.*`

### Requirement: Compatibilidade legado com governança e prazo de retirada

Durante o rollout, os endpoints do Organograma SHALL aceitar as permissões legado (`teams.read`/`legendarios.read`/`tops.read`, hoje no `view` da tela `org-chart`) **ou** o novo `organogram.read`/toggles. A migração SHALL acontecer editando o `view`/`edit` da tela `org-chart` no `SCREEN_CATALOG` (re-mapeia todos de uma vez), não por reatribuição perfil a perfil. A compatibilidade SHALL ser governada e temporária: (a) cada decisão via legado SHALL ser registrada em log estruturado; (b) quando as duas vias forem avaliáveis, o backend SHALL computar a decisão antiga e a nova em paralelo (shadow/parity check) e emitir telemetria quando divergirem, sem que a via nova negue/permita sozinha antes do corte; (c) a retirada do legado SHALL ser etapa explícita da Fase 4, condicionada a `user-access-control` fechado e parity check sem divergências no período observado. A compatibilidade NÃO SHALL ser permanente.

#### Scenario: Ambas as vias aceitas durante o rollout

- **WHEN** um usuário com a tela org-chart concedida via permissões legado acessa o Organograma antes do corte
- **THEN** o acesso é permitido pela via legado e a decisão é registrada com `via = legacy`

#### Scenario: Divergência entre antigo e novo é telemetrada

- **WHEN** a decisão legada e a nova divergem para a mesma requisição
- **THEN** o efetivo segue o legado (pré-corte) e um evento de `parity_mismatch` é emitido para análise

#### Scenario: Retirada do legado na Fase 4

- **WHEN** `user-access-control` está fechado e o parity check não acusa divergências no período observado
- **THEN** a aceitação das permissões legado é removida e os endpoints passam a exigir apenas `organogram.*`
