# church-geocoding Specification

## Purpose
TBD - created by archiving change geolocalizacao-automatica-igrejas. Update Purpose after archive.
## Requirements
### Requirement: Serviço de geocoding via Nominatim
O sistema SHALL prover um serviço de geocoding no módulo de Igrejas que consulte o Nominatim do OpenStreetMap (`GET https://nominatim.openstreetmap.org/search?q={consulta}&format=json&limit=1`), enviando `User-Agent` que identifique a aplicação (ex.: `GestaoLGND/1.0`). A busca SHALL seguir uma cascata de fallback: quando houver **endereço** informado, o serviço SHALL buscar primeiro por `endereço + cidade`; sem resultado, SHALL buscar por `nome da igreja + cidade`; sem resultado, SHALL buscar somente por `cidade`. Sem resultado em nenhuma das buscas, o serviço SHALL retornar `null`. Para o endereço, o serviço SHALL tentar o texto literal e, se não resolver, uma versão com **abreviações brasileiras expandidas** (ex.: `St.`→`Setor`, `Av.`→`Avenida`), e NÃO SHALL anexar a cidade quando o endereço já a contém (evita query duplicada). O retorno SHALL incluir a **precisão** do resultado (`address` = casou pelo endereço; `name` = por nome+cidade; `city` = só a cidade/centro), além de `{ lat, lng, displayName }`.

#### Scenario: Busca por endereço tem prioridade
- **WHEN** o serviço recebe endereço além de nome e cidade que o Nominatim reconhece
- **THEN** retorna as coordenadas do `endereço + cidade` com `precision: 'address'`, mais precisas que o centro da cidade

#### Scenario: Expande abreviação para o endereço resolver
- **WHEN** o endereço usa abreviação que o Nominatim não reconhece (ex.: "St." de Setor) e a versão literal não retorna resultado
- **THEN** o serviço tenta a versão expandida ("Setor") e resolve o endereço, em vez de cair no centro da cidade

#### Scenario: Só a cidade resolve é marcado como impreciso
- **WHEN** nem o endereço nem o nome+cidade resolvem, e só a cidade retorna resultado
- **THEN** o retorno tem `precision: 'city'` (centro da cidade), sinalizando que NÃO é o endereço

#### Scenario: Busca por nome e cidade retorna coordenadas
- **WHEN** o serviço recebe nome de igreja e cidade que o Nominatim reconhece, sem endereço
- **THEN** retorna `{ lat, lng, displayName }` com `lat`/`lng` numéricos

#### Scenario: Fallback somente por cidade
- **WHEN** as buscas por endereço e por nome + cidade não retornam resultado, mas a cidade é reconhecida
- **THEN** o serviço executa uma busca apenas por cidade e retorna as coordenadas dela

#### Scenario: Nenhum resultado
- **WHEN** nenhuma das buscas em cascata retorna resultado
- **THEN** o serviço retorna `null`

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
O sistema SHALL expor `GET /churches/geocode?city={cidade}&name={igreja}&address={endereço}`, protegido por `JwtAuthGuard` + `PermissionsGuard` com `@Permissions('churches.read')`, com query validada por `class-validator`, retornando `{ lat, lng, displayName }` ou `null` quando não houver resultado. Quando `address` for informado, o preview SHALL priorizá-lo na cascata de busca (mesmo comportamento do save). A rota estática `geocode` SHALL ser declarada antes de rotas parametrizadas como `GET /churches/:id`.

#### Scenario: Preview usa endereço quando informado
- **WHEN** um usuário com `churches.read` chama `GET /churches/geocode` com `city` e `address`
- **THEN** o preview geocodifica priorizando `endereço + cidade`

#### Scenario: Sem permissão
- **WHEN** um usuário sem `churches.read` chama o endpoint
- **THEN** a requisição é negada com 403

### Requirement: Preenchimento automático no formulário de Igreja
O formulário de Igreja SHALL oferecer um campo **Endereço** opcional e um botão **"Buscar localização automaticamente"**. Ao buscar, o sistema SHALL usar nome, cidade e (quando preenchido) o endereço, preenchendo latitude/longitude com o resultado e mantendo os campos editáveis (ajuste manual como fonte de verdade). O endereço informado SHALL ser persistido na igreja e reutilizado no geocoding ao salvar.

#### Scenario: Endereço melhora a busca automática
- **WHEN** o usuário preenche o endereço e aciona "Buscar localização automaticamente"
- **THEN** a busca prioriza o endereço e retorna coordenadas mais precisas que o centro da cidade

#### Scenario: Endereço é persistido e reutilizado
- **WHEN** uma igreja é criada ou editada com endereço
- **THEN** o endereço é salvo e usado como base do geocoding ao salvar (sem sobrescrever coordenadas manuais)

#### Scenario: Feedback honesto quando o resultado é aproximado
- **WHEN** a busca automática retorna um resultado com precisão `name` ou `city` (não casou pelo endereço)
- **THEN** o formulário SHALL avisar que o ponto é aproximado e pedir conferência/ajuste, em vez de declarar "endereço encontrado"

