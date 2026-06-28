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

    expect(result).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(decodeURIComponent(url)).toContain('Igreja Central, Goiânia');
  });

  it('primeira busca vazia executa fallback somente por cidade', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([])).mockResolvedValueOnce(okResponse(HIT));

    const result = await service.geocode('Igreja Inexistente', 'Goiânia');

    expect(result).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil' });
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

    expect(second).toEqual({ lat: -16.6869, lng: -49.2648, displayName: 'Goiânia, GO, Brasil' });
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
