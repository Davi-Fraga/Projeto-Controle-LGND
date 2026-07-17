> Implementada em 2026-07-17 (branch `feat/mapa-distribuicao-intra-cidade`). Escopo reduzido: só endereço da igreja para geocoding certeiro — a parte de mapa por bairro foi cancelada e revertida.

## 1. Banco

- [x] 1.1 `Church.address String?` no `schema.prisma` + migration nova `20260717120000_add_church_address` (aplicada no dev DB).

## 2. Backend

- [x] 2.1 `GeocodingService.geocode(name, city, locationHint?)`: cascata `endereço+cidade → nome+cidade → cidade`; cacheKey inclui o hint.
- [x] 2.2 `ChurchesService.create/update`: persiste `address`; usa como hint; geocoda também ao mudar o endereço; nunca sobrescreve coords manuais.
- [x] 2.3 `GeocodeQueryDto` + `ChurchesController.geocode`: aceitam `address` e repassam ao serviço.

## 3. Frontend

- [x] 3.1 `Church` (shared) + `ChurchPayload` + `geocodeChurch` ganham `address`.
- [x] 3.2 `church-form.tsx`: input **Endereço** (prefill + payload); "Buscar localização automaticamente" envia o endereço.

## 4. Correção do bug "endereço caía no centro da cidade" (2026-07-17)

Causa-raiz (reproduzida no Nominatim real): (a) o serviço **duplicava a cidade** na query e (b) o Nominatim **não reconhece abreviações BR** — "St." (Setor) devolvia vazio, caindo no fallback de cidade; e o app ainda dizia "Endereço encontrado".

- [x] 4.1 `br-address.ts` (`expandBrAbbreviations`): St.→Setor, Av.→Avenida, R.→Rua, Pça.→Praça, Jd., Rod., Pq., Cj., Qd. — com fronteira de palavra + testes.
- [x] 4.2 `GeocodingService`: tenta o endereço literal e, se falhar, a versão expandida; **não anexa a cidade quando o endereço já a contém**; retorna `precision: 'address' | 'name' | 'city'`.
- [x] 4.3 `church-form.tsx`: feedback honesto — verde só quando `precision === 'address'`; `name`/`city` viram aviso "ponto aproximado, confira/ajuste o pino".
- [x] 4.4 Verificação end-to-end no Nominatim real com o endereço do bug: antes centro (-16.6809, -49.2533) → agora Avenida Central, Setor Urias Magalhães (-16.6382, -49.2711), `precision=address`.

## 5. Verificação

- [x] 5.1 API lint (eslint+tsc) ✓ · **241 testes ✓** (cascata, expansão BR, no-dup-cidade, precisão, wiring) · web tsc/lint ✓.
- [x] 5.2 Verificado na UI em produção (autor): campo Endereço no formulário + geocoding pelo endereço; deploy via PR #11 + `deploy.sh`.
