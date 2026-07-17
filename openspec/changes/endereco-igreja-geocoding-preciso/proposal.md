## Why

Ao cadastrar/editar uma igreja, o "Buscar localização automaticamente" geocodifica só por `nome + cidade` — o que frequentemente cai no **centro genérico da cidade** e gera pinos imprecisos/confusos. Falta um campo de **endereço** na tela da igreja para a busca automática ser certeira.

## What Changes

- **Campo `Endereço` no formulário de Igreja** (cadastro e edição), opcional.
- **Geocoding usa o endereço quando preenchido**: busca em cascata `endereço + cidade → nome + cidade → cidade`, tanto no "Buscar localização automaticamente" (preview) quanto ao salvar. Ajuste manual de latitude/longitude continua sendo a fonte de verdade.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `church-geocoding`: o serviço passa a aceitar um endereço opcional e priorizá-lo na cascata de busca; o endpoint de preview (`GET /churches/geocode`) e o create/update de igreja passam o endereço.

## Impact

- **Backend**: `GeocodingService.geocode` (3º parâmetro opcional `locationHint`); `ChurchesService.create/update` (persiste `address` e usa como hint); `GeocodeQueryDto` + `ChurchesController.geocode` (aceitam `address`).
- **Banco**: migration nova adiciona `Church.address` (nulável). Nenhuma migration aplicada é alterada.
- **Frontend**: `church-form.tsx` (input Endereço + envio); `Church` (shared) e `ChurchPayload`/`geocodeChurch` ganham `address`.
- **Fora de escopo**: qualquer visualização por bairro no mapa (descartada); busca/filtros da listagem de igrejas (change `busca-filtros-igrejas`, separada).
