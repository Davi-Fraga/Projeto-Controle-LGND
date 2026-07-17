import { Injectable, Logger } from '@nestjs/common';
import { expandBrAbbreviations } from './br-address';

/** Coordenada crua devolvida pelo Nominatim, antes de anexar a precisão. */
type GeocodeHit = {
  lat: number;
  lng: number;
  displayName: string;
};

/**
 * Nível de precisão do resultado, para o consumidor ser honesto com o usuário:
 * - `address`: casou pelo endereço informado (preciso);
 * - `name`: casou por nome da igreja + cidade (aproximado);
 * - `city`: só a cidade resolveu (centro da cidade — NÃO é o endereço).
 */
export type GeocodePrecision = 'address' | 'name' | 'city';

export type GeocodeResult = GeocodeHit & { precision: GeocodePrecision };

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

  /**
   * Geocoda em cascata. Quando `locationHint` (endereço da igreja) é informado, ele é
   * mais específico que o nome e é tentado PRIMEIRO: `endereço + cidade` →
   * `nome + cidade` → `cidade`. Sem `locationHint`, o comportamento é o original
   * (`nome + cidade` → `cidade`).
   */
  async geocode(name?: string | null, city?: string | null, locationHint?: string | null): Promise<GeocodeResult | null> {
    const trimmedName = name?.trim() || null;
    const trimmedCity = city?.trim() || null;
    const trimmedHint = locationHint?.trim() || null;

    if (!trimmedName && !trimmedCity && !trimmedHint) return null;

    const key = this.cacheKey(trimmedName, trimmedCity, trimmedHint);
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    try {
      const result = await this.lookup(trimmedName, trimmedCity, trimmedHint);
      // cacheia tanto o hit quanto a busca vazia (null), mas nunca um erro
      this.cache.set(key, result);
      return result;
    } catch (error) {
      this.logger.warn(`Geocoding indisponível para "${trimmedHint ?? trimmedName ?? ''} / ${trimmedCity ?? ''}": ${(error as Error).message}`);
      return null;
    }
  }

  private async lookup(name: string | null, city: string | null, locationHint: string | null): Promise<GeocodeResult | null> {
    // 1) Endereço (mais preciso). Tenta o texto literal e, se falhar, a versão com
    //    abreviações BR expandidas ("St." → "Setor"), que o Nominatim reconhece melhor.
    for (const query of this.hintQueries(locationHint, city)) {
      const hit = await this.request(query);
      if (hit) return { ...hit, precision: 'address' };
    }
    // 2) Nome da igreja + cidade (aproximado).
    if (name && city) {
      const hit = await this.request(`${name}, ${city}`);
      if (hit) return { ...hit, precision: 'name' };
    }
    // 3) Só cidade (centro da cidade — último recurso, não é o endereço).
    if (city) {
      const hit = await this.request(city);
      if (hit) return { ...hit, precision: 'city' };
    }
    return null;
  }

  /**
   * Consultas a tentar para o endereço, em ordem, sem repetir: texto literal e versão
   * expandida. A cidade só é anexada quando o endereço ainda NÃO a contém — evita a
   * query duplicada ("...Goiânia..., Goiânia") que o Nominatim rejeitava.
   */
  private hintQueries(locationHint: string | null, city: string | null): string[] {
    if (!locationHint) return [];
    const withCity = (text: string) =>
      city && !this.normalize(text).includes(this.normalize(city)) ? `${text}, ${city}` : text;
    const raw = withCity(locationHint);
    const expanded = withCity(expandBrAbbreviations(locationHint));
    return [...new Set([raw, expanded])];
  }

  /** Uma chamada ao Nominatim, serializada e respeitando o throttle. Lança em erro de rede/resposta inválida. */
  private request(query: string): Promise<GeocodeHit | null> {
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

  private async fetchOne(query: string): Promise<GeocodeHit | null> {
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

  private cacheKey(name: string | null, city: string | null, locationHint: string | null): string {
    return `${this.normalize(locationHint)}|${this.normalize(name)}|${this.normalize(city)}`;
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
