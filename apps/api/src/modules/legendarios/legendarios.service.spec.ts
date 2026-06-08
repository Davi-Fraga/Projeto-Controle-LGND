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
      },
      church: { findFirst: jest.fn() },
      profession: { findFirst: jest.fn() },
      expertise: { count: jest.fn() },
      legendaryHistory: { findMany: jest.fn(), create: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildLegendaryWhere: jest.fn(),
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

  it('findOne returns 404 when legendary is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: [], legendaryIds: [] });
    accessPolicy.buildLegendaryWhere.mockReturnValueOnce({ id: { in: [] } });
    prisma.legendary.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne('legendary-1', restrictedUser)).rejects.toBeInstanceOf(NotFoundException);
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
