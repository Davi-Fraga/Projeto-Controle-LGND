import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { TopsService } from '../../modules/tops/tops.service';
import { LEGENDARY_RELATION, LEGENDARY_RELATION_SELECT } from './legendary-relation.select';

// Campos que o `prisma/schema.prisma` marca como dado pessoal sensível (D12) ou que
// são contato de TERCEIRO (familiar, líder espiritual) — nunca podem sair numa
// listagem embutida, para nenhum papel. PII fica no detalhe `GET /legendarios/:id`.
const NEVER_IN_RELATION = [
  'email',
  'birthDate',
  'relativeName',
  'relativePhone',
  'relativeEmail',
  'spiritualLeaderName',
  'spiritualLeaderPhone',
  'skillsText',
  'notes',
];

describe('LEGENDARY_RELATION_SELECT', () => {
  it('não expõe dado pessoal sensível nem contato de terceiro', () => {
    for (const field of NEVER_IN_RELATION) {
      expect(LEGENDARY_RELATION_SELECT).not.toHaveProperty(field);
    }
  });

  it('mantém os campos que as telas embutidas realmente consomem', () => {
    for (const field of ['id', 'fullName', 'lgndNumber', 'city', 'phone', 'status']) {
      expect(LEGENDARY_RELATION_SELECT).toHaveProperty(field, true);
    }
  });
});

/**
 * Invariante estrutural (mesmo espírito do `screen-catalog.spec`): o recorte só
 * protege enquanto ninguém reintroduzir `include: { legendary: true }`, que devolve
 * a linha inteira do Legendário. Este teste varre o código e falha na reintrodução —
 * é o que impede a correção de se desfazer por copiar/colar de um módulo antigo.
 */
describe('nenhum módulo embute o Legendário cru', () => {
  const RELATIONS = [
    'legendary',
    'responsible',
    'coordinator',
    'deputyCoordinator',
    'representative',
    'deputyRepresentative',
    'generalCoordinator',
    'familyCoordinator',
    'familyDeputyCoordinator',
    'familyGeneralCoordinator',
    'cityLeader',
  ];
  // `\b` evita casar sentinelas de teste como `__legendary: true`.
  const RAW_INCLUDE = new RegExp(`\\b(${RELATIONS.join('|')})\\s*:\\s*true`, 'g');

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      return entry.endsWith('.ts') && !entry.endsWith('.spec.ts') ? [full] : [];
    });

  it('usa LEGENDARY_RELATION em todo include de relação de Legendário', () => {
    const srcRoot = join(__dirname, '..', '..');
    const offenders = walk(srcRoot)
      .filter((file) => !file.endsWith('legendary-relation.select.ts'))
      .flatMap((file) => {
        const matches = readFileSync(file, 'utf8').match(RAW_INCLUDE) ?? [];
        return matches.map((match) => `${file.slice(srcRoot.length + 1)}: ${match}`);
      });

    expect(offenders).toEqual([]);
  });
});

describe('TopsService.findParticipants (cenário do vazamento)', () => {
  it('não deixa a query pedir PII ao listar participantes de um TOP', async () => {
    const prisma: any = {
      topEvent: { findFirst: jest.fn().mockResolvedValue({ id: 'top-1' }) },
      topParticipant: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const accessPolicy: any = { resolveScope: jest.fn().mockResolvedValue({ isAdmin: false }) };
    const service = new TopsService(prisma, { create: jest.fn() } as any, accessPolicy);

    await service.findParticipants('top-1', {} as any);

    const [call] = prisma.topParticipant.findMany.mock.calls;
    expect(call[0].include).toEqual({ legendary: LEGENDARY_RELATION });
    expect(call[0].include.legendary.select).not.toHaveProperty('email');
    expect(call[0].include.legendary.select).not.toHaveProperty('birthDate');
  });
});
