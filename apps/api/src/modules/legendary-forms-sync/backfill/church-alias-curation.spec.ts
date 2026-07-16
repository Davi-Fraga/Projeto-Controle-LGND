import { decideChurchAlias, planChurchBackfill } from './church-alias-curation';
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

describe('planChurchBackfill', () => {
  const clusters = [
    {
      canonical: 'Primeira Igreja Batista (PIB) — Caldas Novas',
      variants: ['PIB', 'Primeira Batista', 'Primeira Igreja Batista (PIB) — Caldas Novas'],
    },
    { canonical: 'Igreja Sal da Terra', variants: ['Sal da terra'] },
  ];

  it('banco vazio: conta igrejas e aliases a criar; variante == canônico é no-op', () => {
    const plan = planChurchBackfill(clusters, [], []);
    expect(plan.churchesToCreate).toHaveLength(2);
    expect(plan.churchesExisting).toBe(0);
    // 'PIB', 'Primeira Batista', 'Sal da terra' → 3; a variante igual ao canônico → no-op
    expect(plan.aliasesToCreate.map((a) => a.alias).sort()).toEqual(['PIB', 'Primeira Batista', 'Sal da terra']);
    expect(plan.aliasNoop).toBe(1);
    expect(plan.collisions).toHaveLength(0);
  });

  it('igreja existente conta como já existente e não recria', () => {
    const existing = [{ id: 'ch-sal', name: 'Igreja Sal da Terra' }];
    const plan = planChurchBackfill(clusters, existing, []);
    expect(plan.churchesExisting).toBe(1);
    expect(plan.churchesToCreate).toEqual(['Primeira Igreja Batista (PIB) — Caldas Novas']);
  });

  it('colisão: variante cujo normalizado é canônico de OUTRA igreja é reportada, não criada', () => {
    const existing = [{ id: 'ch-outra', name: 'Sal da Terra' }]; // normaliza p/ "sal da terra"
    const plan = planChurchBackfill(clusters, existing, []);
    expect(plan.collisions).toEqual(['"Sal da terra" (cluster "Igreja Sal da Terra")']);
    expect(plan.aliasesToCreate.map((a) => a.alias)).not.toContain('Sal da terra');
  });

  it('colisão: variante que já é alias de OUTRA igreja é reportada', () => {
    const existing = [{ id: 'ch-x', name: 'Igreja X' }];
    const aliases = [{ normalizedAlias: 'pib', churchId: 'ch-x' }];
    const plan = planChurchBackfill(clusters, existing, aliases);
    expect(plan.collisions).toContain('"PIB" (cluster "Primeira Igreja Batista (PIB) — Caldas Novas")');
  });
});
