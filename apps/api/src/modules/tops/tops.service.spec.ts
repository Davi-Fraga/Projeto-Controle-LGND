import { BadRequestException } from '@nestjs/common';
import {
  TopEventStatus,
  TopParticipantStatus,
  TopParticipantType,
  TopServantStatus,
} from '@central-da-manada/shared';
import { TopsService } from './tops.service';

describe('TopsService', () => {
  let service: TopsService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      topEvent: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      legendary: { findFirst: jest.fn() },
      team: { findFirst: jest.fn() },
      topTeam: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      topParticipant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      topServant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    audit = { create: jest.fn() };
    const accessPolicy = { resolveScope: jest.fn().mockResolvedValue({ isAdmin: true }), buildTopWhere: jest.fn().mockReturnValue({}) } as any;
    service = new TopsService(prisma, audit, accessPolicy);
  });

  it('creates TOP', async () => {
    prisma.topEvent.findFirst.mockResolvedValueOnce(null);
    prisma.topEvent.create.mockResolvedValueOnce({ id: 'top-1', name: 'TOP 1', number: 1, _count: { participants: 0, servants: 0, teams: 0 } });
    const result = await service.create({ name: 'TOP 1', number: 1, city: 'Brasilia', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-03'), status: TopEventStatus.PLANNED });
    expect(result.id).toBe('top-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('blocks invalid date range', async () => {
    await expect(service.create({ name: 'TOP', number: 1, city: 'Brasilia', startDate: new Date('2026-06-03'), endDate: new Date('2026-06-01'), status: TopEventStatus.PLANNED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks duplicated leadership people', async () => {
    prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    await expect(service.update('top-1', { representativeLegendaryId: 'l1', deputyRepresentativeLegendaryId: 'l1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('links team to TOP and blocks duplicate', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1' });
    prisma.topTeam.findFirst.mockResolvedValueOnce(null);
    prisma.topTeam.create.mockResolvedValueOnce({ id: 'tt-1', topEventId: 'top-1', teamId: 'team-1' });
    await expect(service.addTeam('top-1', { teamId: 'team-1' })).resolves.toMatchObject({ id: 'tt-1' });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1' });
    prisma.topTeam.findFirst.mockResolvedValueOnce({ id: 'tt-1' });
    await expect(service.addTeam('top-1', { teamId: 'team-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds participant and blocks duplicate', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.legendary.findFirst.mockResolvedValue({ id: 'l1' });
    prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.create.mockResolvedValueOnce({ id: 'p1', legendaryId: 'l1' });
    await expect(service.addParticipant('top-1', { legendaryId: 'l1', type: TopParticipantType.LEGENDARY, status: TopParticipantStatus.REGISTERED })).resolves.toMatchObject({ id: 'p1' });
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1' });
    await expect(service.addParticipant('top-1', { legendaryId: 'l1', type: TopParticipantType.LEGENDARY, status: TopParticipantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds servant, validates team link and blocks participant conflict', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.legendary.findFirst.mockResolvedValue({ id: 'l1' });
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
    prisma.topTeam.findFirst.mockResolvedValueOnce(null);
    await expect(service.addServant('top-1', { legendaryId: 'l1', teamId: 'team-1', status: TopServantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1' });
    await expect(service.addServant('top-1', { legendaryId: 'l1', status: TopServantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels participant and servant', async () => {
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1', topEventId: 'top-1' });
    prisma.topParticipant.update.mockResolvedValueOnce({ id: 'p1', status: TopParticipantStatus.CANCELLED });
    await expect(service.cancelParticipant('top-1', 'p1')).resolves.toMatchObject({ status: TopParticipantStatus.CANCELLED });
    prisma.topServant.findFirst.mockResolvedValueOnce({ id: 's1', topEventId: 'top-1' });
    prisma.topServant.update.mockResolvedValueOnce({ id: 's1', status: TopServantStatus.CANCELLED });
    await expect(service.cancelServant('top-1', 's1')).resolves.toMatchObject({ status: TopServantStatus.CANCELLED });
  });
});

describe('TopsService org-chart', () => {
  let service: TopsService;
  let prisma: any;

  const top = { id: 'top-1', number: 7, name: 'Rota do Cerrado', representativeLegendaryId: 'rep-1', generalCoordinatorLegendaryId: 'gc-1', familyCoordinatorLegendaryId: 'fc-1', _count: {} };

  beforeEach(() => {
    prisma = {
      topEvent: { findFirst: jest.fn().mockResolvedValue(top) },
      topTeam: { findMany: jest.fn().mockResolvedValue([]) },
      topServant: { findMany: jest.fn().mockResolvedValue([]) },
      topFamily: { findMany: jest.fn().mockResolvedValue([]) },
      topParticipant: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new TopsService(prisma, { create: jest.fn() } as any, { resolveScope: jest.fn().mockResolvedValue({ isAdmin: true }), buildTopWhere: jest.fn().mockReturnValue({}) } as any);
  });

  it('builds teams view with team, servants, "Sem equipe" group and aggregated count', async () => {
    prisma.topTeam.findMany.mockResolvedValueOnce([{ id: 'tt1', teamId: 'team-a', team: { name: 'Equipe A' }, coordinatorLegendaryId: 'coord-1' }]);
    prisma.topServant.findMany.mockResolvedValueOnce([
      { id: 's1', teamId: 'team-a', legendary: { fullName: 'Servo 1' }, role: 'Cozinha' },
      { id: 's2', teamId: 'team-a', legendary: { fullName: 'Servo 2' } },
      { id: 's3', teamId: null, legendary: { fullName: 'Servo Solto' } },
    ]);

    const root = await service.getOrgChart('top-1', 'teams');

    expect(root.kind).toBe('root');
    expect(root.id).toBe('top:top-1');
    expect(root.count).toBe(3);
    const coordination = root.children[0];
    expect(coordination.id).toBe('coordination:general');
    expect(coordination.leaderId).toBe('gc-1');
    expect(coordination.count).toBe(3);
    const teamNode = coordination.children.find((n) => n.id === 'team:tt1')!;
    expect(teamNode.label).toBe('Equipe A');
    expect(teamNode.leaderId).toBe('coord-1');
    expect(teamNode.count).toBe(2);
    const noTeam = coordination.children.find((n) => n.id === 'team:none')!;
    expect(noTeam.label).toBe('Sem equipe');
    expect(noTeam.count).toBe(1);
    expect(noTeam.leaderId).toBeUndefined();
  });

  it('builds families view with leader and family without chief (no leaderId)', async () => {
    prisma.topFamily.findMany.mockResolvedValueOnce([
      { id: 'f1', name: 'Familia Leao', representativeLegendaryId: 'rep-f1', members: [{ id: 'm1', topParticipant: { legendary: { fullName: 'Membro 1' } } }] },
      { id: 'f2', name: 'Familia Aguia', representativeLegendaryId: null, members: [] },
    ]);

    const root = await service.getOrgChart('top-1', 'families');

    const coordination = root.children[0];
    expect(coordination.id).toBe('coordination:family');
    expect(coordination.leaderId).toBe('fc-1');
    const fam1 = coordination.children.find((n) => n.id === 'family:f1')!;
    expect(fam1.leaderId).toBe('rep-f1');
    expect(fam1.count).toBe(1);
    const fam2 = coordination.children.find((n) => n.id === 'family:f2')!;
    expect(fam2.leaderId).toBeUndefined();
    expect(fam2.count).toBe(0);
  });

  it('builds cities view grouping equivalent city spellings and a "Sem cidade" group', async () => {
    prisma.topParticipant.findMany.mockResolvedValueOnce([
      { id: 'p1', legendary: { fullName: 'A', city: 'Goiânia' } },
      { id: 'p2', legendary: { fullName: 'B', city: 'goiania ' } },
      { id: 'p3', legendary: { fullName: 'C', city: null } },
    ]);

    const root = await service.getOrgChart('top-1', 'cities');

    const cityNode = root.children.find((n) => n.kind === 'city')!;
    expect(cityNode.count).toBe(2);
    const noCity = root.children.find((n) => n.id === 'city:none')!;
    expect(noCity.label).toBe('Sem cidade');
    expect(noCity.count).toBe(1);
    expect(root.count).toBe(3);
  });

  it('returns the same OrgChartNode shape across the three views (contract)', async () => {
    const assertShape = (node: any) => {
      expect(typeof node.id).toBe('string');
      expect(['root', 'group', 'leader', 'person', 'city']).toContain(node.kind);
      expect(typeof node.label).toBe('string');
      expect(typeof node.count).toBe('number');
      expect(Array.isArray(node.children)).toBe(true);
      node.children.forEach(assertShape);
    };
    for (const view of ['teams', 'families', 'cities'] as const) {
      const root = await service.getOrgChart('top-1', view);
      assertShape(root);
    }
  });
});
