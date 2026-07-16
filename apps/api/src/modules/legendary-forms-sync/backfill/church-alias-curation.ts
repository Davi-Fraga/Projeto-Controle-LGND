import { normalizeName } from '@central-da-manada/shared';

export type AliasDecision = 'created' | 'noop' | 'collision';

/**
 * Decide, de forma PURA e determinística, o que fazer com uma variante de grafia ao
 * populá-la como alias do seu canônico (change church-name-aliases, regra D2):
 *  - `noop`      → variante vazia, igual ao canônico desta igreja, ou alias já existente
 *                  para a MESMA igreja (idempotente).
 *  - `collision` → a forma normalizada já é alias de OUTRA igreja, ou é o nome canônico
 *                  de OUTRA igreja (ambíguo → pular e reportar; nunca sobrescreve).
 *  - `created`   → deve ser criado.
 *
 * Não toca no banco; o chamador (backfill de igrejas) persiste em `created` e atualiza
 * seus mapas. Unicidade real é garantida também pela constraint `normalizedAlias @unique`.
 */
export function decideChurchAlias(params: {
  variant: string;
  churchId: string;
  canonicalNormalized: string;
  canonicalOwnerByNorm: Map<string, string>;
  aliasOwnerByNorm: Map<string, string>;
}): { decision: AliasDecision; normalizedAlias: string } {
  const { variant, churchId, canonicalNormalized, canonicalOwnerByNorm, aliasOwnerByNorm } = params;
  const normalizedAlias = normalizeName(variant);

  if (!normalizedAlias || normalizedAlias === canonicalNormalized) return { decision: 'noop', normalizedAlias };

  const canonOwner = canonicalOwnerByNorm.get(normalizedAlias);
  if (canonOwner && canonOwner !== churchId) return { decision: 'collision', normalizedAlias };

  const aliasOwner = aliasOwnerByNorm.get(normalizedAlias);
  if (aliasOwner) return { decision: aliasOwner === churchId ? 'noop' : 'collision', normalizedAlias };

  return { decision: 'created', normalizedAlias };
}

export interface ChurchBackfillPlan {
  /** Nomes canônicos que ainda não existem no banco (seriam criados). */
  churchesToCreate: string[];
  /** Quantos canônicos da curadoria já existem no banco. */
  churchesExisting: number;
  /** Aliases a criar; `canonicalNormalized` liga ao canônico (resolve-se o id no --apply). */
  aliasesToCreate: { alias: string; normalizedAlias: string; canonicalNormalized: string }[];
  /** Variantes que já são alias (mesma igreja) ou iguais ao próprio canônico. */
  aliasNoop: number;
  /** Colisões puladas (identificadas por cluster canônico, sem PII). */
  collisions: string[];
}

/**
 * Plano PURO e determinístico do backfill de igrejas a partir da curadoria + estado
 * atual do banco. É a MESMA lógica usada pelo `--plan` (preview read-only) e pelo
 * `--apply` (que executa o plano) — garante que o preview prevê fielmente o apply.
 * Não toca no banco. Igrejas a criar recebem um id sintético (`new:<norm>`) só para
 * agrupar seus próprios aliases na decisão de colisão; o `--apply` troca pelo id real.
 */
export function planChurchBackfill(
  clusters: { canonical: string; variants: string[] }[],
  existingChurches: { id: string; name: string }[],
  existingAliases: { normalizedAlias: string; churchId: string }[],
): ChurchBackfillPlan {
  const canonicalOwnerByNorm = new Map<string, string>();
  for (const c of existingChurches) canonicalOwnerByNorm.set(normalizeName(c.name), c.id);

  const churchesToCreate: string[] = [];
  let churchesExisting = 0;
  for (const cluster of clusters) {
    const name = (cluster.canonical ?? '').trim();
    if (!name) continue;
    const key = normalizeName(name);
    if (canonicalOwnerByNorm.has(key)) { churchesExisting++; continue; }
    canonicalOwnerByNorm.set(key, `new:${key}`);
    churchesToCreate.push(name);
  }

  const aliasOwnerByNorm = new Map<string, string>();
  for (const a of existingAliases) aliasOwnerByNorm.set(a.normalizedAlias, a.churchId);

  const aliasesToCreate: { alias: string; normalizedAlias: string; canonicalNormalized: string }[] = [];
  let aliasNoop = 0;
  const collisions: string[] = [];
  for (const cluster of clusters) {
    const canonicalName = (cluster.canonical ?? '').trim();
    if (!canonicalName) continue;
    const canonicalNormalized = normalizeName(canonicalName);
    const churchId = canonicalOwnerByNorm.get(canonicalNormalized);
    if (!churchId) continue;
    for (const variant of cluster.variants ?? []) {
      const { decision, normalizedAlias } = decideChurchAlias({
        variant,
        churchId,
        canonicalNormalized,
        canonicalOwnerByNorm,
        aliasOwnerByNorm,
      });
      if (decision === 'created') {
        aliasOwnerByNorm.set(normalizedAlias, churchId);
        aliasesToCreate.push({ alias: variant, normalizedAlias, canonicalNormalized });
      } else if (decision === 'collision') {
        collisions.push(`"${variant}" (cluster "${canonicalName}")`);
      } else {
        aliasNoop++;
      }
    }
  }

  return { churchesToCreate, churchesExisting, aliasesToCreate, aliasNoop, collisions };
}
