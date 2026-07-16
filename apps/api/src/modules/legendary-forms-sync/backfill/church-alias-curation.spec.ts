import { decideChurchAlias } from './church-alias-curation';
import { normalizeName } from '@central-da-manada/shared';

const CANON = 'Primeira Igreja Batista (PIB) — Caldas Novas';
const canonicalNormalized = normalizeName(CANON);

function ctx(over: Partial<Parameters<typeof decideChurchAlias>[0]> = {}) {
  return {
    variant: 'PIB',
    churchId: 'ch-pib',
    canonicalNormalized,
    canonicalOwnerByNorm: new Map<string, string>([[canonicalNormalized, 'ch-pib']]),
    aliasOwnerByNorm: new Map<string, string>(),
    ...over,
  };
}

describe('decideChurchAlias', () => {
  it('cria alias novo sem colisão', () => {
    expect(decideChurchAlias(ctx({ variant: 'PIB' })).decision).toBe('created');
  });

  it('no-op quando a variante é o próprio canônico', () => {
    expect(decideChurchAlias(ctx({ variant: CANON })).decision).toBe('noop');
  });

  it('no-op quando o alias já existe para a MESMA igreja (idempotente)', () => {
    const aliasOwnerByNorm = new Map([[normalizeName('PIB'), 'ch-pib']]);
    expect(decideChurchAlias(ctx({ variant: 'PIB', aliasOwnerByNorm })).decision).toBe('noop');
  });

  it('colisão quando o alias já existe para OUTRA igreja', () => {
    const aliasOwnerByNorm = new Map([[normalizeName('Batista'), 'ch-outra']]);
    expect(decideChurchAlias(ctx({ variant: 'Batista', aliasOwnerByNorm })).decision).toBe('collision');
  });

  it('colisão quando a variante é o canônico de OUTRA igreja', () => {
    const canonicalOwnerByNorm = new Map([
      [canonicalNormalized, 'ch-pib'],
      [normalizeName('Igreja Sal da Terra'), 'ch-sal'],
    ]);
    const d = decideChurchAlias(ctx({ variant: 'Igreja Sal da Terra', canonicalOwnerByNorm }));
    expect(d.decision).toBe('collision');
  });

  it('devolve a forma normalizada da variante', () => {
    expect(decideChurchAlias(ctx({ variant: 'Primeira Batista' })).normalizedAlias).toBe('primeira batista');
  });
});
