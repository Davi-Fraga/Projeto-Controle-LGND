import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamMembershipStatus } from '@central-da-manada/shared';
import { ReportsService } from './reports.service';

const adminUser = { sub: 'admin-id', email: 'a@x.com', roles: ['COORDINATION_ADMIN'], permissions: [] } as any;
const restrictedUser = { sub: 'user-id', email: 'u@x.com', roles: ['MEMBER'], permissions: ['reports.read'] } as any;

describe('ReportsService (CITY scope / PII)', () => {
  let service: ReportsService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      topParticipant: { findMany: jest.fn().mockResolvedValue([]) },
      topServant: { findMany: jest.fn().mockResolvedValue([]) },
      legendary: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      church: { findMany: jest.fn().mockResolvedValue([]) },
      team: { findMany: jest.fn().mockResolvedValue([]) },
      profession: { findMany: jest.fn().mockResolvedValue([]) },
      expertise: { findMany: jest.fn().mockResolvedValue([]) },
      topEvent: {
        findFirst: jest.fn().mockResolvedValue({ city: 'Goiânia' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      topFamily: { findMany: jest.fn().mockResolvedValue([]) },
      topFamilyMember: { findMany: jest.fn().mockResolvedValue([]) },
      socialAction: { findFirst: jest.fn().mockResolvedValue({ city: 'Goiânia' }) },
      socialActionParticipant: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: true }),
      buildCityWhere: jest.fn().mockReturnValue({ id: { in: [] } }),
      assertCityAllowed: jest.fn(),
    };
    service = new ReportsService(prisma, audit, accessPolicy);
  });

  it('topParticipants validates the TOP city and then returns the complete authorized dataset', async () => {
    const scope = {
      isAdmin: false,
      cityKeys: ['goiania'],
      legendaryCities: ['Goiânia'],
    };
    accessPolicy.resolveScope.mockResolvedValueOnce(scope);

    await service.topParticipants('top-1', restrictedUser);

    expect(accessPolicy.assertCityAllowed).toHaveBeenCalledWith(scope, 'Goiânia');
    expect(prisma.topParticipant.findMany).toHaveBeenCalledWith({
      where: { topEventId: 'top-1', deletedAt: null },
      include: { legendary: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('returns 404 for a TOP outside CITY scope before querying report rows', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      cityKeys: ['anapolis'],
    });
    accessPolicy.assertCityAllowed.mockImplementationOnce(() => {
      throw new ForbiddenException('City out of scope.');
    });

    await expect(
      service.topParticipants('top-external', restrictedUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.topParticipant.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 for an external Social Action and does not expose participants', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      cityKeys: [],
    });
    accessPolicy.assertCityAllowed.mockImplementationOnce(() => {
      throw new ForbiddenException('City out of scope.');
    });

    await expect(
      service.socialActionParticipants('action-external', restrictedUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.socialActionParticipant.findMany).not.toHaveBeenCalled();
  });

  it('byChurch counts only geographically visible legendaries and omits empty churches', async () => {
    const cityFilter = { city: { in: ['Goiânia'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false });
    accessPolicy.buildCityWhere.mockReturnValueOnce(cityFilter);

    await service.byChurch(restrictedUser);

    const legWhere = { deletedAt: null, AND: [cityFilter] };
    expect(prisma.church.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, legendarios: { some: legWhere } },
      select: {
        id: true,
        name: true,
        city: true,
        _count: { select: { legendarios: { where: legWhere } } },
      },
      orderBy: { name: 'asc' },
    });
  });

  it('byTeam ignores TEAM scope and counts memberships through visible legendaries', async () => {
    const cityFilter = { city: { in: ['Goiânia'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      teamIds: ['team-external'],
    });
    accessPolicy.buildCityWhere.mockReturnValueOnce(cityFilter);

    await service.byTeam(restrictedUser);

    const membershipWhere = {
      deletedAt: null,
      status: TeamMembershipStatus.ACTIVE,
      legendary: { deletedAt: null, AND: [cityFilter] },
    };
    expect(prisma.team.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, memberships: { some: membershipWhere } },
      select: {
        id: true,
        name: true,
        _count: { select: { memberships: { where: membershipWhere } } },
      },
      orderBy: { name: 'asc' },
    });
  });

  it('CITY=MISSING is fail-closed across every pending-review branch', async () => {
    const missingFilter = { id: { in: [] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, cityKeys: [] });
    accessPolicy.buildCityWhere.mockReturnValue(missingFilter);

    await service.pendingReview(restrictedUser);

    expect(prisma.legendary.findMany.mock.calls[0][0].where.AND).toEqual([missingFilter]);
    expect(prisma.topEvent.findMany.mock.calls[0][0].where.AND).toEqual([missingFilter]);
    expect(prisma.topFamily.findMany.mock.calls[0][0].where.topEvent.AND).toEqual([missingFilter]);
    expect(prisma.topFamilyMember.findMany.mock.calls[0][0].where.topEvent.AND).toEqual([missingFilter]);
  });

  it('CITY=ALL leaves every pending-review branch geographically unrestricted', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, allCities: true });
    accessPolicy.buildCityWhere.mockReturnValue({});

    await service.pendingReview(restrictedUser);

    expect(prisma.legendary.findMany.mock.calls[0][0].where.AND).toEqual([{}]);
    expect(prisma.topEvent.findMany.mock.calls[0][0].where.AND).toEqual([{}]);
    expect(prisma.topFamily.findMany.mock.calls[0][0].where.topEvent.AND).toEqual([{}]);
    expect(prisma.topFamilyMember.findMany.mock.calls[0][0].where.topEvent.AND).toEqual([{}]);
  });

  // `sourceNotes` foi removida na Fase 2 da change ajustes-top-familias: a observação do
  // membro é um campo único (`notes`), sem prefixo/linha "Origem".
  it('pendingReview uses only notes for family members', async () => {
    prisma.topFamilyMember.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        notes: 'nota geral',
        topFamily: { name: 'Fam' },
        topParticipant: { legendary: { fullName: 'João' } },
      },
    ]);

    const rows = await service.pendingReview(adminUser);
    const member = rows.find((row: any) => row.tipo === 'Membro de família');

    expect(member?.observacao).toBe('nota geral');
  });

  it('CSV delegates to the same authorized TOP query and does not audit a denied export', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, cityKeys: [] });
    accessPolicy.assertCityAllowed.mockImplementationOnce(() => {
      throw new ForbiddenException('City out of scope.');
    });

    await expect(
      service.exportTopParticipants('top-external', restrictedUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.topParticipant.findMany).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });
});
