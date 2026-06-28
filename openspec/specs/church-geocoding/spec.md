# church-geocoding Specification

## Purpose
TBD - created by archiving change geolocalizacao-automatica-igrejas. Update Purpose after archive.
## Requirements
### Requirement: Serviço de geocoding via Nominatim
O sistema SHALL prover um serviço de geocoding no módulo de Igrejas que consulte o Nominatim do OpenStreetMap (`GET https://nominatim.openstreetmap.org/search?q={igreja},{cidade}&format=json&limit=1`), enviando `User-Agent` que identifique a aplicação (ex.: `GestaoLGND/1.0`). O serviço SHALL buscar primeiro por `nome da igreja + cidade` e, sem resultado, SHALL fazer fallback buscando somente por `cidade`. Sem resultado em nenhuma das buscas, o serviço SHALL retornar `null`. O contrato de retorno SHALL ser `{ lat: number, lng: number, displayName: string } | null`, convertendo latitude/longitude textuais do Nominatim em números.

#### Scenario: Busca por nome e cidade retorna coordenadas
- **WHEN** o serviço recebe nome de igreja e cidade que o Nominatim reconhece
- **THEN** retorna `{ lat, lng, displayName }` com `lat`/`lng` numéricos

#### Scenario: Fallback somente por cidade
- **WHEN** a busca por nome + cidade não retorna resultado, mas a cidade é reconhecida
- **THEN** o serviço executa uma segunda busca apenas por cidade e retorna as coordenadas dela

#### Scenario: Nenhum resultado
- **WHEN** nem a busca por nome + cidade nem a busca por cidade retornam resultado
- **THEN** o serviço retorna `null`

#### Scenario: User-Agent enviado
- **WHEN** o serviço chama o Nominatim
- **THEN** a requisição inclui um cabeçalho `User-Agent` identificando a aplicação

#### Scenario: Falha externa não propaga
- **WHEN** ocorre erro de rede ou resposta inválida do Nominatim
- **THEN** o serviço retorna `null` sem lançar exceção para quem o chamou

### Requirement: Cache e throttle do geocoding
O serviço SHALL impedir que chamadas externas ao Nominatim ocorram em intervalo inferior a um segundo (throttle local) e SHALL manter um cache local com chave normalizada a partir de `name` + `city`, cacheando tanto resultados encontrados quanto buscas sem resultado. O serviço NÃO SHALL manter promises rejeitadas ou erros permanentes no cache, e NÃO SHALL introduzir Redis ou infraestrutura global apenas para esta funcionalidade.

#### Scenario: Cache evita nova chamada
- **WHEN** uma mesma combinação normalizada de `name`/`city` é consultada novamente
- **THEN** o resultado vem do cache, sem nova chamada ao Nominatim

#### Scenario: Throttle respeita o intervalo
- **WHEN** duas buscas externas distintas são disparadas em sequência imediata
- **THEN** a segunda chamada externa só parte respeitando o intervalo mínimo de um segundo

### Requirement: Geocoding na criação de Igreja
Ao criar uma Igreja, quando latitude e longitude NÃO forem informadas, o sistema SHALL buscar coordenadas pelo serviço de geocoding usando `name` e `city` e preencher antes de persistir, quando houver resultado. Quando o usuário informar coordenadas manualmente, o sistema NÃO SHALL chamar o geocoding nem sobrescrevê-las. Quando o geocoding retornar `null` ou falhar, a Igreja SHALL ser criada normalmente sem coordenadas.

#### Scenario: Create sem coordenadas usa geocoding
- **WHEN** uma Igreja é criada sem latitude/longitude e o geocoding encontra resultado
- **THEN** a Igreja é persistida com as coordenadas obtidas

#### Scenario: Create preserva coordenadas manuais
- **WHEN** uma Igreja é criada com latitude/longitude informadas
- **THEN** o geocoding não é chamado e as coordenadas informadas são persistidas sem alteração

#### Scenario: Create resiliente a falha
- **WHEN** uma Igreja é criada sem coordenadas e o geocoding retorna `null` ou falha
- **THEN** a Igreja é criada sem coordenadas, sem erro

### Requirement: Geocoding na edição de Igreja
Ao editar uma Igreja, o sistema SHALL geocodificar apenas quando `name` ou `city` tiver mudado e o payload NÃO trouxer coordenadas manuais. O sistema NÃO SHALL chamar o Nominatim em edições sem mudança de nome ou cidade, e NÃO SHALL sobrescrever coordenadas informadas manualmente. Se o geocoding falhar, a edição SHALL continuar sem quebrar.

#### Scenario: Update geocodifica ao mudar nome ou cidade
- **WHEN** uma edição altera `name` ou `city` e não envia coordenadas manuais
- **THEN** o serviço busca novas coordenadas e as aplica

#### Scenario: Update sem mudança de nome/cidade não busca
- **WHEN** uma edição mantém `name` e `city` inalterados
- **THEN** o Nominatim não é chamado

#### Scenario: Update preserva coordenadas manuais
- **WHEN** uma edição muda `name` ou `city` mas envia latitude/longitude manuais
- **THEN** as coordenadas manuais são preservadas e o geocoding não as sobrescreve

### Requirement: Endpoint de pré-visualização de geocoding
O sistema SHALL expor `GET /churches/geocode?city={cidade}&name={igreja}`, protegido por `JwtAuthGuard` + `PermissionsGuard` com `@Permissions('churches.read')`, com query validada por `class-validator`, retornando `{ lat, lng, displayName }` ou `null` quando não houver resultado. A rota estática `geocode` SHALL ser declarada antes de rotas parametrizadas como `GET /churches/:id`.

#### Scenario: Pré-visualização com permissão
- **WHEN** um usuário com `churches.read` chama `GET /churches/geocode` com `city`/`name` válidos
- **THEN** recebe `{ lat, lng, displayName }` ou `null`, conforme o resultado do geocoding

#### Scenario: Sem permissão
- **WHEN** um usuário sem `churches.read` chama o endpoint
- **THEN** a requisição é negada com 403

#### Scenario: Query inválida
- **WHEN** a query não satisfaz as regras do DTO
- **THEN** a API responde 400 sem chamar o geocoding

#### Scenario: Rota não confundida com ID
- **WHEN** a requisição é `GET /churches/geocode`
- **THEN** é roteada para o handler de geocoding, e não para `GET /churches/:id`

### Requirement: Preenchimento automático no formulário de Igreja
O formulário de Igreja SHALL tratar latitude e longitude como campos opcionais e secundários e SHALL oferecer um botão **"Buscar localização automaticamente"**, habilitado somente quando os campos mínimos exigidos pelo DTO estiverem disponíveis. Ao buscar, o sistema SHALL preencher latitude/longitude com o resultado, exibir o `displayName` para confirmação e manter os campos editáveis (preenchimento manual como fallback). O formulário SHALL exibir estados de carregamento, resultado não encontrado e erro sem bloquear o restante do preenchimento.

#### Scenario: Busca preenche e confirma
- **WHEN** o usuário aciona "Buscar localização automaticamente" com nome e cidade preenchidos e há resultado
- **THEN** os campos de latitude/longitude são preenchidos e o `displayName` é exibido para confirmação

#### Scenario: Ajuste manual após busca
- **WHEN** o resultado automático está incorreto
- **THEN** o usuário pode editar latitude/longitude manualmente e salvar

#### Scenario: Estados sem bloqueio
- **WHEN** a busca está em andamento, não encontra resultado ou falha
- **THEN** o formulário mostra o estado correspondente e o restante dos campos permanece utilizável

