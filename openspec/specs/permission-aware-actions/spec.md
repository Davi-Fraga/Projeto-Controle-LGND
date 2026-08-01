# permission-aware-actions Specification

## Purpose
Toda ação visual (botão, link, item de menu) reflete a permission efetiva exigida pelo endpoint correspondente, para que a interface nunca ofereça um caminho que a API vai recusar, nem esconda uma ação que o usuário pode de fato executar. O backend permanece a única barreira de segurança.

## Requirements

### Requirement: Ações visuais usam a permission exata
Botões, links e itens de menu que executam uma operação protegida SHALL ser renderizados somente quando o usuário possui a permission efetiva exigida pelo endpoint correspondente.

#### Scenario: Usuário somente leitura
- **GIVEN** um usuário com permissions VIEW sem permissions de mutação
- **WHEN** ele abre uma lista ou detalhe
- **THEN** ações de editar, excluir, inativar, restaurar, enviar ou administrar sub-recursos não aparecem

#### Scenario: Permission específica
- **GIVEN** um usuário com a permission efetiva de uma operação
- **WHEN** ele abre a tela correspondente
- **THEN** a ação dessa operação aparece
- **AND** nenhuma ação adicional é inferida apenas pelo papel

### Requirement: Menus vazios e links proibidos não são oferecidos
Depois de filtrar ações, a interface SHALL NOT renderizar `ActionMenu` vazio nem link para uma rota que dependa de permission ausente.

#### Scenario: Nenhuma ação na linha
- **GIVEN** uma linha que não possui nenhuma ação permitida
- **WHEN** a tabela é renderizada
- **THEN** o acionador do menu não aparece

#### Scenario: Link cruzado sem permission
- **GIVEN** dados visíveis em uma tela e permission ausente para a tela de destino
- **WHEN** o campo é renderizado
- **THEN** o valor pode aparecer como texto
- **AND** não é oferecido como link navegável

### Requirement: Sub-recursos de TOP usam permissions granulares
Participantes, servos, equipes, famílias e pré-inscrições de TOP SHALL condicionar cada ação à permission granular correspondente.

#### Scenario: Participantes somente leitura
- **GIVEN** um usuário com `tops.participants.read` sem add/update/remove
- **WHEN** ele abre participantes do TOP
- **THEN** pode visualizar a tabela
- **AND** não vê ações de adicionar, editar ou remover

#### Scenario: Família com transferência
- **GIVEN** um usuário com `tops.families.members.transfer`
- **WHEN** ele abre a gestão de família
- **THEN** a ação de transferência aparece
- **AND** outras ações ausentes continuam escondidas

### Requirement: Comunicação e Relatórios respeitam ações finas
Enviar ou cancelar comunicação, gerir destinatários e exportar relatórios SHALL depender de suas permissions específicas, não apenas da permission de leitura da tela.

#### Scenario: Relatório sem exportação
- **GIVEN** um usuário com `reports.read` sem `reports.export`
- **WHEN** ele abre um relatório exportável
- **THEN** o controle de exportação não aparece

#### Scenario: Comunicado sem envio
- **GIVEN** um usuário com `communications.read` sem `communications.send`
- **WHEN** ele abre um comunicado em estado enviável
- **THEN** a ação Enviar não aparece

### Requirement: Backend permanece autoritativo
A ausência ou presença de um controle visual SHALL NOT alterar as regras dos endpoints protegidos.

#### Scenario: Controle forjado
- **GIVEN** um usuário sem permission de mutação
- **WHEN** ele forja o botão ou chama o endpoint manualmente
- **THEN** a API retorna `403`
