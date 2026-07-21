import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LegendaryStatus } from '@central-da-manada/shared';
import { LegendariosService } from './legendarios.service';

const adminUser = { sub: 'admin-id', email: 'admin@example.com', roles: ['COORDINATION_ADMIN'], permissions: [] };
const restrictedUser = { sub: 'user-id', email: 'user@example.com', roles: ['SPIRITUAL_LEADER'], permissions: [] };

describe('LegendariosService', () => {
  let service: LegendariosService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      legendary: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      teamMembership: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      church: { findFirst: jest.fn() },
      profession: { findFirst: jest.fn() },
      expertise: { count: jest.fn() },
      legendaryHistory: { findMany: jest.fn(), create: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildLegendaryWhere: jest.fn(),
      buildLegendaryDetailWhere: jest.fn(),
      buildTeamMembershipWhere: jest.fn(),
    };
    service = new LegendariosService(prisma, audit, accessPolicy);
  });

  it('lists legendarios with pagination (admin sees all)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findMany.mockResolvedValueOnce([
      { id: '1', fullName: 'Joao', expertises: [] },
    ]);
    prisma.legendary.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, perPage: 10 }, adminUser);

    expect(result.meta.total).toBe(1);
    expect(result.data[0].fullName).toBe('Joao');
    expect(accessPolicy.buildLegendaryWhere).not.toHaveBeenCalled();
  });

  it('NUNCA expõe email/birthDate em listagem, nem para admin (D12 — dados sensíveis)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findMany.mockResolvedValueOnce([
      { id: '1', fullName: 'Joao', email: 'joao@x.com', birthDate: new Date('1990-01-01'), expertises: [] },
    ]);
    prisma.legendary.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, perPage: 10 }, adminUser);

    expect(result.data[0]).not.toHaveProperty('email');
    expect(result.data[0]).not.toHaveProperty('birthDate');
    expect(result.data[0].fullName).toBe('Joao');
  });

  it('findOne expõe email/birthDate para admin (visão administrativa de detalhe)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Joao', email: 'joao@x.com', birthDate: new Date('1990-01-01'), expertises: [] });

    const result: any = await service.findOne('1', adminUser);

    expect(result.email).toBe('joao@x.com');
    expect(result.birthDate).toBeInstanceOf(Date);
  });

  it('findOne OCULTA email/birthDate para papel escopado (não-admin)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: ['church-1'], teamIds: [], legendaryIds: [] });
    accessPolicy.buildLegendaryDetailWhere.mockReturnValueOnce({ OR: [{ churchId: { in: ['church-1'] } }] });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Joao', email: 'joao@x.com', birthDate: new Date('1990-01-01'), expertises: [] });

    const result: any = await service.findOne('1', restrictedUser);

    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('birthDate');
    expect(result.fullName).toBe('Joao');
  });

  it('scopes findAll for restricted user by appending AND filter', async () => {
    const scopeFilter = { OR: [{ churchId: { in: ['church-1'] } }] };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: ['church-1'], teamIds: [], legendaryIds: [] });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce(scopeFilter);
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10 }, restrictedUser);

    const [findManyCall] = prisma.legendary.findMany.mock.calls;
    expect(findManyCall[0].where.AND).toContainEqual(scopeFilter);
  });

  it('filters by active membership in an authorized team and preserves geographic scope', async () => {
    const scopeFilter = { OR: [{ city: { in: ['Caldas Novas'] } }] };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce(scopeFilter);
    accessPolicy.buildTeamMembershipWhere.mockReturnValueOnce({ teamId: { in: ['team-1'] } });
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 2, perPage: 10, search: 'joao', teamId: 'team-1' } as any, restrictedUser);

    const call = prisma.legendary.findMany.mock.calls[0][0];
    expect(call.where.AND).toContainEqual(scopeFilter);
    expect(call.where.OR).toContainEqual({ searchText: { contains: 'joao' } });
    expect(call.where.teamMemberships).toEqual({
      some: {
        teamId: { in: ['team-1'] },
        status: 'ACTIVE',
        deletedAt: null,
        team: { deletedAt: null },
      },
    });
    expect(call.skip).toBe(10);
  });

  it('uses an impossible membership filter for a team outside the user scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: ['church-1'], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce({ churchId: { in: ['church-1'] } });
    accessPolicy.buildTeamMembershipWhere.mockReturnValueOnce({ teamId: { in: [] } });
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10, teamId: 'team-2' } as any, restrictedUser);

    expect(prisma.legendary.findMany.mock.calls[0][0].where.teamMemberships.some.teamId).toEqual({ in: [] });
  });

  it('allows an admin to filter by any team while keeping active memberships only', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    accessPolicy.buildTeamMembershipWhere.mockReturnValueOnce({ teamId: 'team-1' });
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10, teamId: 'team-1' } as any, adminUser);

    expect(prisma.legendary.findMany.mock.calls[0][0].where.teamMemberships.some).toEqual({
      teamId: 'team-1',
      status: 'ACTIVE',
      deletedAt: null,
      team: { deletedAt: null },
    });
  });

  it('busca textual filtra por searchText normalizado e NÃO inclui clause de phone (regressão do bug "retorna todos")', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10, search: 'João' }, adminUser);

    const or = prisma.legendary.findMany.mock.calls[0][0].where.OR;
    expect(or).toContainEqual({ searchText: { contains: 'joao' } });
    // termo sem dígitos não pode gerar clause de phone (era `contains: ''`, que casava todos)
    expect(or.some((clause: any) => 'phone' in clause)).toBe(false);
  });

  it('busca numérica filtra por phone usando apenas os dígitos', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findMany.mockResolvedValueOnce([]);
    prisma.legendary.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10, search: '(61) 99999' }, adminUser);

    const or = prisma.legendary.findMany.mock.calls[0][0].where.OR;
    expect(or).toContainEqual({ phone: { contains: '6199999' } });
  });

  it('define searchText normalizado (sem acento/caixa) ao criar', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce(null);
    prisma.legendary.create.mockResolvedValueOnce({ id: '1', fullName: 'João Silva', expertises: [] });

    await service.create({
      fullName: 'João Silva',
      city: 'Goiânia',
      lgndNumber: 'A12',
      isFromRotaDoCerrado: true,
      servesInChurch: false,
      status: LegendaryStatus.ACTIVE,
      socialActionInterest: false,
      expertiseIds: [],
    });

    const createData = prisma.legendary.create.mock.calls[0][0].data;
    expect(createData.searchText).toBe('joao silva goiania a12');
  });

  it('options filtra no backend por searchText, respeita o limite e retorna metadata de desambiguação', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findMany.mockResolvedValueOnce([
      { id: '1', fullName: 'João Silva', lgndNumber: '123', city: 'Goiânia', church: { name: 'Igreja X' } },
    ]);

    const result = await service.options({ search: 'joão', limit: 5, activeOnly: true } as any, adminUser);

    const call = prisma.legendary.findMany.mock.calls[0][0];
    expect(call.where.OR).toContainEqual({ searchText: { contains: 'joao' } });
    expect(call.take).toBe(5);
    expect(result[0]).toEqual(
      expect.objectContaining({
        value: '1',
        metadata: expect.objectContaining({ city: 'Goiânia', lgndNumber: '123', church: 'Igreja X' }),
      }),
    );
  });

  it('findOne returns 404 when legendary is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [] });
    accessPolicy.buildLegendaryDetailWhere.mockReturnValueOnce({ id: { in: [] } });
    prisma.legendary.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne('legendary-1', restrictedUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne uses the detail filter for a member of an authorized team', async () => {
    const detailFilter = {
      teamMemberships: {
        some: {
          teamId: { in: ['team-1'] },
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
    };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildLegendaryDetailWhere.mockReturnValueOnce(detailFilter);
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Joao', expertises: [] });

    await service.findOne('1', restrictedUser);

    expect(prisma.legendary.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '1', deletedAt: null, AND: [detailFilter] },
    }));
  });

  it('findOne succeeds for admin regardless of scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Joao', expertises: [] });

    const result = await service.findOne('1', adminUser);

    expect(result.fullName).toBe('Joao');
    expect(accessPolicy.buildLegendaryWhere).not.toHaveBeenCalled();
  });

  it('creates a legendario', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce(null);
    prisma.legendary.create.mockResolvedValueOnce({
      id: '1',
      fullName: 'Joao Silva',
      phone: '61999999999',
      expertises: [],
    });

    const result = await service.create({
      fullName: 'Joao Silva',
      phone: '(61) 99999-9999',
      isFromRotaDoCerrado: true,
      servesInChurch: false,
      status: LegendaryStatus.ACTIVE,
      socialActionInterest: true,
      expertiseIds: [],
    });

    expect(prisma.legendary.create).toHaveBeenCalled();
    expect(result.phone).toBe('61999999999');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }), expect.anything());
  });

  it('blocks duplicated LGND number', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({ id: 'existing', lgndNumber: '123' });

    await expect(
      service.create({
        fullName: 'Joao Silva',
        lgndNumber: '123',
        isFromRotaDoCerrado: true,
        servesInChurch: false,
        status: LegendaryStatus.ACTIVE,
        socialActionInterest: false,
        expertiseIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a legendario and replaces expertises', async () => {
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Antes', expertises: [] });
    prisma.legendary.findUnique.mockResolvedValueOnce(null);
    prisma.expertise.count.mockResolvedValueOnce(1);
    prisma.$transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        legendaryExpertise: { deleteMany: jest.fn() },
        legendary: {
          update: jest.fn().mockResolvedValue({
            id: '1',
            fullName: 'Depois',
            expertises: [{ expertise: { id: 'exp-1', name: 'Logistica' } }],
          }),
        },
      }),
    );

    const result = await service.update('1', {
      fullName: 'Depois',
      expertiseIds: ['exp-1'],
    });

    expect(result.fullName).toBe('Depois');
    expect(result.expertises).toHaveLength(1);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }));
  });

  it('findHistory throws 404 when the legendary is outside the user scope (IDOR guard)', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [] });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce({ id: { in: [] } });
    prisma.legendary.findFirst.mockResolvedValueOnce(null);

    await expect(service.findHistory('legendary-1', {}, restrictedUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.legendaryHistory.findMany).not.toHaveBeenCalled();
  });

  it('findHistory returns history when the legendary is accessible', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'legendary-1' });
    prisma.legendaryHistory.findMany.mockResolvedValueOnce([{ id: 'h1' }]);

    const result = await service.findHistory('legendary-1', {}, adminUser);

    expect(result).toHaveLength(1);
  });

  it('soft deletes and marks as inactive', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({ id: '1', fullName: 'Joao', expertises: [] });
    // deactivate roda numa transação (libera geridos → sem gestor) e devolve o registro atualizado
    prisma.$transaction.mockImplementationOnce(async (cb: any) => cb(prisma));
    prisma.legendary.update.mockResolvedValueOnce({
      id: '1',
      fullName: 'Joao',
      status: LegendaryStatus.INACTIVE,
      deletedAt: new Date(),
      expertises: [],
    });

    const result = await service.deactivate('1');

    expect(result.status).toBe(LegendaryStatus.INACTIVE);
    expect(prisma.legendary.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: LegendaryStatus.INACTIVE }),
      }),
    );
  });
});
