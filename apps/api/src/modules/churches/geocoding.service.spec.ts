import { GeocodingService } from './geocoding.service';

type NominatimRow = { lat: string; lon: string; display_name: string };

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

const HIT: NominatimRow[] = [{ lat: '-16.6869', lon: '-49.2648', display_name: 'Goiânia, GO, Brasil' }];

describe('GeocodingService', () => {
  let service: GeocodingService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new GeocodingService();
    // keep the throttle out of the way for everything except the throttle test
    service.minIntervalMs = 0;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('busca por nome + cidade retorna coordenadas', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HIT));

    const result = await service.geocode('Igreja Central', 'Goiânia');

    expect(result).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil', precision: 'name' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(decodeURIComponent(url)).toContain('Igreja Central, Goiânia');
  });

  it('primeira busca vazia executa fallback somente por cidade (precision=city)', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([])).mockResolvedValueOnce(okResponse(HIT));

    const result = await service.geocode('Igreja Inexistente', 'Goiânia');

    expect(result).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil', precision: 'city' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(String(fetchMock.mock.calls[1][0]))).toContain('q=Goiânia');
  });

  it('duas buscas vazias retornam null', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([])).mockResolvedValueOnce(okResponse([]));

    const result = await service.geocode('Nada', 'Lugar Nenhum');

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('envia User-Agent identificando a aplicação', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HIT));

    await service.geocode('Igreja Central', 'Goiânia');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('User-Agent')).toBe('GestaoLGND/1.0');
  });

  it('converte latitude/longitude em texto para números', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HIT));

    const result = await service.geocode('Igreja Central', 'Goiânia');

    expect(typeof result!.lat).toBe('number');
    expect(typeof result!.lng).toBe('number');
  });

  it('erro de rede retorna null sem propagar e sem cachear', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const first = await service.geocode('Igreja Central', 'Goiânia');
    expect(first).toBeNull();

    // segunda tentativa com a mesma chave deve chamar a rede de novo (não ficou em cache)
    fetchMock.mockResolvedValueOnce(okResponse(HIT));
    const second = await service.geocode('Igreja Central', 'Goiânia');

    expect(second).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil', precision: 'name' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cache evita nova chamada para a mesma busca normalizada', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(HIT));

    const first = await service.geocode('Igreja Central', 'Goiânia');
    // grafia equivalente (caixa/acento/espaços) deve cair na mesma chave
    const second = await service.geocode('  IGREJA   CENTRAL ', 'goiania');

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('endereço tem prioridade e é buscado antes de nome + cidade', async () => {
    const ADDR_HIT: NominatimRow[] = [{ lat: '-16.70', lon: '-49.30', display_name: 'Av. Bueno, 100, Goiânia, GO' }];
    fetchMock.mockResolvedValueOnce(okResponse(ADDR_HIT));

    const result = await service.geocode('Igreja Central', 'Goiânia', 'Av. Bueno, 100');

    expect(result).toEqual({ lat: -16.7, lng: -49.3, displayName: 'Av. Bueno, 100, Goiânia, GO', precision: 'address' });
    // uma única chamada: a de endereço + cidade resolveu, sem cair no nome
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain('Av. Bueno, 100, Goiânia');
  });

  it('endereço sem resultado cai no fallback nome + cidade', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([])).mockResolvedValueOnce(okResponse(HIT));

    const result = await service.geocode('Igreja Central', 'Goiânia', 'Rua Inexistente, 999');

    expect(result).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil', precision: 'name' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain('Rua Inexistente, 999, Goiânia');
    expect(decodeURIComponent(String(fetchMock.mock.calls[1][0]))).toContain('Igreja Central, Goiânia');
  });

  it('REGRESSÃO: expande "St." → "Setor" para o endereço resolver (bug do centro da cidade)', async () => {
    // 1ª chamada: literal com "St." → Nominatim devolve vazio (o bug real)
    // 2ª chamada: versão expandida com "Setor" → acha o endereço
    const ADDR: NominatimRow[] = [{ lat: '-16.6382', lon: '-49.2711', display_name: 'Avenida Central, Setor Urias Magalhães, Goiânia' }];
    fetchMock.mockResolvedValueOnce(okResponse([])).mockResolvedValueOnce(okResponse(ADDR));

    const result = await service.geocode('Igreja X', 'Goiânia', 'Av. Central, 167 - St. Urias Magalhães, Goiânia - GO');

    expect(result?.precision).toBe('address');
    expect(result?.lat).toBeCloseTo(-16.6382);
    const urls = fetchMock.mock.calls.map((c) => decodeURIComponent(String(c[0])));
    expect(urls[0]).toContain('St. Urias'); // tentou o literal primeiro
    expect(urls[1]).toContain('Setor Urias'); // e depois o expandido, que resolveu
  });

  it('não duplica a cidade quando o endereço já a contém', async () => {
    const ADDR: NominatimRow[] = [{ lat: '-16.6', lon: '-49.2', display_name: 'Rua X, Goiânia' }];
    fetchMock.mockResolvedValueOnce(okResponse(ADDR));

    await service.geocode('Igreja X', 'Goiânia', 'Rua X, 10 - Setor Y, Goiânia - GO');

    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    // "Goiânia" aparece só uma vez (a do próprio endereço), sem o ", Goiânia" anexado
    expect(url.match(/Goiânia/g) ?? []).toHaveLength(1);
  });

  it('locationHint distinto gera chave de cache distinta (não colide com só nome+cidade)', async () => {
    const ADDR_HIT: NominatimRow[] = [{ lat: '-16.70', lon: '-49.30', display_name: 'Av. Bueno, 100' }];
    fetchMock.mockResolvedValueOnce(okResponse(HIT)).mockResolvedValueOnce(okResponse(ADDR_HIT));

    const noHint = await service.geocode('Igreja Central', 'Goiânia');
    const withHint = await service.geocode('Igreja Central', 'Goiânia', 'Av. Bueno, 100');

    expect(noHint).not.toEqual(withHint);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throttle respeita o intervalo mínimo entre chamadas externas', async () => {
    service.minIntervalMs = 60;
    const timestamps: number[] = [];
    fetchMock.mockImplementation(async () => {
      timestamps.push(Date.now());
      return okResponse(HIT);
    });

    await service.geocode('Igreja A', 'Cidade A');
    await service.geocode('Igreja B', 'Cidade B');

    expect(timestamps).toHaveLength(2);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(55);
  });
});
