## MODIFIED Requirements

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
