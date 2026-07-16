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
