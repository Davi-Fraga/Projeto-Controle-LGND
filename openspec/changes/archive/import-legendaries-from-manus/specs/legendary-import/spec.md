## ADDED Requirements

### Requirement: Importação de legendários a partir da exportação do Manus
O importador SHALL ler a exportação JSON do Manus (aceitando o array direto OU o envelope `{ result: { data: { json: [...] } } }`) e criar/atualizar registros em `Legendary`, `Team` e `TeamMembership`. Todo `Legendary` resultante SHALL ter `isFromRotaDoCerrado = true` e `status = ACTIVE`. Se o JSON não estiver em um formato reconhecido, o importador SHALL abortar com erro claro.

#### Scenario: Importação popula os registros
- **WHEN** o importador roda com um JSON válido de N membros
- **THEN** existem N registros `Legendary` correspondentes, todos com `isFromRotaDoCerrado = true` e `status = ACTIVE`

#### Scenario: Formato de JSON não reconhecido
- **WHEN** o conteúdo não é nem um array nem o envelope esperado
- **THEN** o importador lança erro e não grava nada

### Requirement: Normalização de cidade canônica
O importador SHALL mapear cada grafia de cidade para uma cidade canônica usando uma tabela de mapeamento explícita, de modo que múltiplas grafias da mesma cidade resultem em um único valor `city`. A normalização SHALL remover acentos, sufixo de UF e espaços redundantes ao computar a chave. Grafias ausentes do mapa SHALL receber um valor de fallback Title-Case derivado da chave.

#### Scenario: Grafias divergentes convergem para uma cidade
- **WHEN** a exportação contém "Caldas Novas", "Caldas novas" e "CALDAS NOVAS"
- **THEN** todos os `Legendary` correspondentes recebem o mesmo valor canônico `city = "Caldas Novas"`

#### Scenario: Grafia de cidade fora do mapa
- **WHEN** a exportação contém uma grafia de cidade que não está na tabela de mapeamento
- **THEN** o `Legendary` recebe um `city` Title-Case derivado da chave normalizada

### Requirement: Normalização de telefone
O importador SHALL normalizar telefones para o formato BR `(DD) XXXXX-XXXX` (celular, 11 dígitos) ou `(DD) XXXX-XXXX` (fixo, 10 dígitos), removendo `+55`, zero de DDD e espaços. Quando o resultado não tiver 10 nem 11 dígitos, o importador SHALL gravar os dígitos restantes (ou `null` se vazio).

#### Scenario: Telefones em formatos diversos
- **WHEN** a exportação traz "+55 (62) 99969-9827" e telefones com `0` no DDD ou com espaços
- **THEN** os valores gravados em `phone` ficam no formato `(DD) XXXXX-XXXX`

### Requirement: Normalização de lgndNumber
O importador SHALL normalizar `numeroLegendario` mantendo apenas dígitos antes de gravar em `lgndNumber`, garantindo compatibilidade com a unicidade de `lgndNumber`.

#### Scenario: Número com ponto
- **WHEN** a exportação traz `numeroLegendario = "148.929"`
- **THEN** o `Legendary` é gravado com `lgndNumber = "148929"`

### Requirement: Idempotência por lgndNumber
O importador SHALL usar `lgndNumber` normalizado como chave natural (busca por `lgndNumber`; se existe, atualiza; senão, cria), de modo que executar a importação mais de uma vez convirja ao mesmo estado sem criar `Legendary` duplicados.

#### Scenario: Reexecução não duplica
- **WHEN** o importador roda duas vezes sobre a mesma exportação
- **THEN** a contagem de `Legendary` importados é a mesma após a segunda execução que após a primeira

#### Scenario: Atualização de registro existente
- **WHEN** um `Legendary` com aquele `lgndNumber` já existe e a exportação traz dados alterados
- **THEN** o registro existente é atualizado em vez de um novo ser criado

### Requirement: Criação de equipes e vínculos
O importador SHALL resolver ou criar `Team` por nome e criar `TeamMembership` ligando o `Legendary` à sua equipe, com `role` igual à função do Manus (ou `"Membro"`). A criação de vínculo SHALL ser idempotente: um vínculo ativo já existente entre o mesmo `Legendary` e a mesma `Team` não SHALL ser duplicado.

#### Scenario: Vínculo de membro à equipe
- **WHEN** um membro da exportação pertence a uma equipe
- **THEN** existe uma `Team` com aquele nome e uma `TeamMembership` ativa ligando o `Legendary` a ela

#### Scenario: Reexecução não duplica vínculo
- **WHEN** o importador roda novamente sobre os mesmos dados
- **THEN** não há `TeamMembership` ativa duplicada para o mesmo par `Legendary`/`Team`

### Requirement: Marcação de liderança para revisão
O importador SHALL marcar com `needsReview = true` todo `Legendary` cuja função no Manus indique liderança, preservando a função original em `notes` (`"Função no Manus: <funcao>"`), e SHALL NÃO atribuí-lo automaticamente como `coordinator` ou `deputyCoordinator` de uma `Team`.

#### Scenario: Líder do Manus fica pendente de revisão
- **WHEN** um membro tinha função de liderança (ex.: "Coordenador", "Lider")
- **THEN** o `Legendary` correspondente tem `needsReview = true`, `notes` registra a função, e nenhuma `Team` o referencia como coordenador

### Requirement: Resumo final auditável
Ao terminar, o importador SHALL imprimir um resumo da operação contendo, no mínimo: legendários criados, legendários atualizados, vínculos de equipe criados e quantidade marcada para revisão.

#### Scenario: Resumo ao final da execução
- **WHEN** a importação termina
- **THEN** é exibido um resumo com as contagens de criados, atualizados, vínculos criados e marcados para revisão
