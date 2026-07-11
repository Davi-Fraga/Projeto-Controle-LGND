/**
 * Normalização canônica compartilhada entre a API (webhook de sincronização de
 * legendários) e o script de import (`prisma/import-manus.ts`). Fonte ÚNICA de
 * verdade: a chave de deduplicação (número + nome) e a grafia de cidade/telefone
 * precisam ser idênticas nos dois caminhos, senão o mesmo legendário duplicaria.
 *
 * Extraído de `prisma/import-manus.ts` (comportamento preservado) + `normalizeName`
 * alinhado ao `normalizeSearch` de `legendarios.service.ts`.
 */

// ---- Normalização de cidade -------------------------------------------------
// Chaves declaradas em texto livre; o lookup real (CITY_LOOKUP) é construído
// aplicando cityKey() a cada chave, garantindo que entrada e mapa passem pela
// MESMA normalização.
const CANON_CITY: Record<string, string> = {
  'caldas novas': 'Caldas Novas', 'caldas nova': 'Caldas Novas', morrinhos: 'Morrinhos',
  goiania: 'Goiânia', 'aparecida de goiania': 'Aparecida de Goiânia', goiatuba: 'Goiatuba',
  itatiba: 'Itatiba', mairipotaba: 'Mairipotaba', piracanjuba: 'Piracanjuba',
  corumbaiba: 'Corumbaíba', itumbiara: 'Itumbiara', 'rio verde': 'Rio Verde',
  bonfinopolis: 'Bonfinópolis', 'ponta grossa': 'Ponta Grossa', uberlandia: 'Uberlândia',
  sanclerlandia: 'Sanclerlândia', edeia: 'Edéia', caiaponia: 'Caiapônia', aloandia: 'Aloândia',
  luziania: 'Luziânia', alvorada: 'Alvorada', 'aguas lindas de goias': 'Águas Lindas de Goiás',
  ipameri: 'Ipameri', araguari: 'Araguari', 'ribeirao preto': 'Ribeirão Preto',
  pontalina: 'Pontalina', canapolis: 'Canápolis', marzagao: 'Marzagão', catalao: 'Catalão',
  'sao paulo': 'São Paulo', 'bela vista de goias': 'Bela Vista de Goiás', brasilia: 'Brasília',
  jatai: 'Jataí', maraba: 'Marabá',
};

/** Chave de comparação de cidade: sem acento, minúsculo, sem sufixo de UF, espaços colapsados. */
export function cityKey(s: string): string {
  let k = (s || '').trim().toLowerCase();
  k = k.normalize('NFD').replace(/[̀-ͯ]/g, ''); // tira acentos
  k = k.replace(/-/g, ' ');
  for (const suf of [' goias', ' go']) if (k.endsWith(suf)) k = k.slice(0, -suf.length).trim();
  return k.replace(/\s+/g, ' ').trim();
}

// Lookup normalizado: cityKey aplicado também às chaves do mapa.
const CITY_LOOKUP = new Map<string, string>(
  Object.entries(CANON_CITY).map(([k, v]) => [cityKey(k), v]),
);

/**
 * Canoniza a cidade. Retorna a grafia oficial quando conhecida; senão Title-Case
 * do texto normalizado. Chama `onUnmapped` (opcional) com a grafia crua quando
 * cai no fallback — o import usa isso para reportar cidades fora do mapa.
 */
export function canonCity(s: string | null, onUnmapped?: (raw: string) => void): string | null {
  if (!s) return null;
  const k = cityKey(s);
  if (!k) return null;
  const mapped = CITY_LOOKUP.get(k);
  if (mapped) return mapped;
  if (onUnmapped) onUnmapped(s.trim());
  return k.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ---- Limpeza de telefone e número ------------------------------------------
/** Telefone em formato único: `(DD) NNNNN-NNNN`. Remove DDI 55 e zeros à esquerda. */
export function cleanPhone(t: string | null): string | null {
  let d = (t || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d || null;
}

/** Número de legendário: apenas dígitos (âncora da chave de dedup). */
export function cleanLgnd(n: string | null): string | null {
  const d = (n || '').replace(/\D/g, '');
  return d || null;
}

/**
 * Normaliza nome para comparação da chave de dedup: sem acento, minúsculo,
 * espaços colapsados, trim. Mesmo tratamento do `searchText` (busca acento/caixa
 * insensível). Comparação EXATA pós-normalização (sem fuzzy nesta versão).
 */
export function normalizeName(value: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
