import { Injectable, Logger } from '@nestjs/common';

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

type NominatimRow = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

/**
 * Geocoding via Nominatim (OpenStreetMap). Resolve coordenadas a partir de
 * nome + cidade, com fallback somente por cidade. Tolerante a falha: qualquer
 * erro externo vira `null` sem propagar, para nunca quebrar create/update de Igreja.
 *
 * Cache e throttle são locais ao serviço (sem Redis/infra global), respeitando
 * o limite do Nominatim de ~1 requisição por segundo.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly endpoint = 'https://nominatim.openstreetmap.org/search';
  private readonly userAgent = 'GestaoLGND/1.0';

  /** Intervalo mínimo entre chamadas externas (Nominatim: 1 req/s). */
  minIntervalMs = 1000;

  /** Cache de resultados resolvidos (hits e buscas vazias). Erros NÃO são cacheados. */
  private readonly cache = new Map<string, GeocodeResult | null>();

  /** Fila serializa as chamadas externas para honrar o throttle. */
  private queue: Promise<unknown> = Promise.resolve();
  private lastCallAt = 0;

  async geocode(name?: string | null, city?: string | null): Promise<GeocodeResult | null> {
    const trimmedName = name?.trim() || null;
    const trimmedCity = city?.trim() || null;

    if (!trimmedName && !trimmedCity) return null;

    const key = this.cacheKey(trimmedName, trimmedCity);
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    try {
      const result = await this.lookup(trimmedName, trimmedCity);
      // cacheia tanto o hit quanto a busca vazia (null), mas nunca um erro
      this.cache.set(key, result);
      return result;
    } catch (error) {
      this.logger.warn(`Geocoding indisponível para "${trimmedName ?? ''} / ${trimmedCity ?? ''}": ${(error as Error).message}`);
      return null;
    }
  }

  private async lookup(name: string | null, city: string | null): Promise<GeocodeResult | null> {
    if (name && city) {
      const byNameAndCity = await this.request(`${name}, ${city}`);
      if (byNameAndCity) return byNameAndCity;
    }
    if (city) {
      const byCity = await this.request(city);
      if (byCity) return byCity;
    }
    return null;
  }

  /** Uma chamada ao Nominatim, serializada e respeitando o throttle. Lança em erro de rede/resposta inválida. */
  private request(query: string): Promise<GeocodeResult | null> {
    const run = this.queue.then(async () => {
      const elapsed = Date.now() - this.lastCallAt;
      const wait = this.minIntervalMs - elapsed;
      if (wait > 0) await this.sleep(wait);
      this.lastCallAt = Date.now();
      return this.fetchOne(query);
    });
    // mantém a fila viva mesmo se esta chamada rejeitar
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async fetchOne(query: string): Promise<GeocodeResult | null> {
    const url = `${this.endpoint}?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
    if (!response.ok) {
      throw new Error(`Nominatim respondeu ${response.status}`);
    }

    const rows = (await response.json()) as NominatimRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const [first] = rows;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng, displayName: first.display_name ?? query };
  }

  private cacheKey(name: string | null, city: string | null): string {
    return `${this.normalize(name)}|${this.normalize(city)}`;
  }

  /** Normaliza para chave de cache: sem acento, caixa baixa, espaços colapsados. */
  private normalize(value: string | null): string {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
