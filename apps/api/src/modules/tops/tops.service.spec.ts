import { BadRequestException } from '@nestjs/common';
import {
  TopEventStatus,
  TopFamilyMemberStatus,
  TopParticipantStatus,
  TopParticipantType,
  TopServantStatus,
} from '@central-da-manada/shared';
import { TopsService } from './tops.service';

describe('TopsService', () => {
  let service: TopsService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      topEvent: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      legendary: { findFirst: jest.fn(), findMany: jest.fn() },
      team: { findFirst: jest.fn() },
      topTeam: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      topFamily: { findFirst: jest.fn(), update: jest.fn() },
      topFamilyMember: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      topParticipant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      topServant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = { resolveScope: jest.fn().mockResolvedValue({ isAdmin: true }), buildTopWhere: jest.fn().mockReturnValue({}), buildLegendaryWhere: jest.fn() } as any;
    service = new TopsService(prisma, audit, accessPolicy);
  });

  it('scopes TOP options with the same policy as the main list', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, topIds: ['top-1'] });
    accessPolicy.buildTopWhere.mockReturnValueOnce({ id: { in: ['top-1'] } });
    prisma.topEvent.findMany.mockResolvedValueOnce([]);

    await service.options({ limit: 10 }, {
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['MEMBER'],
      permissions: ['tops.read'],
    });

    expect(prisma.topEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: [{ id: { in: ['top-1'] } }],
      }),
      take: 10,
    }));
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


  it('clears optional family fields when update sends null', async () => {
    const before = {
      id: 'family-1',
      topEventId: 'top-1',
      name: 'Familia Leoes',
      representativeLegendaryId: 'legendary-1',
      representativeRole: 'DOC',
      deputyRepresentativeLegendaryId: 'legendary-2',
      deputyRepresentativeRole: 'Apoio',
      notes: 'Observacao anterior',
      needsReview: false,
      _count: { members: 0 },
    };
    const after = {
      ...before,
      representativeLegendaryId: null,
      representativeRole: null,
      deputyRepresentativeLegendaryId: null,
      deputyRepresentativeRole: null,
      notes: null,
    };

    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: {} });
    prisma.topFamily.findFirst.mockResolvedValue(before);
    prisma.topFamily.update.mockResolvedValue(after);

    await expect(service.updateFamily('top-1', 'family-1', {
      representativeLegendaryId: null,
      representativeRole: null,
      deputyRepresentativeLegendaryId: null,
      deputyRepresentativeRole: null,
      notes: null,
    }, 'actor-1')).resolves.toMatchObject({
      representativeLegendaryId: null,
      representativeRole: null,
      deputyRepresentativeLegendaryId: null,
      deputyRepresentativeRole: null,
      notes: null,
    });

    expect(prisma.topFamily.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'family-1' },
      data: expect.objectContaining({
        topEventId: 'top-1',
        representativeLegendaryId: null,
        representativeRole: null,
        deputyRepresentativeLegendaryId: null,
        deputyRepresentativeRole: null,
        notes: null,
      }),
    }));
    expect(prisma.legendary.findFirst).not.toHaveBeenCalled();
  });

  it('cancels participant and servant', async () => {
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1', topEventId: 'top-1' });
    prisma.topParticipant.update.mockResolvedValueOnce({ id: 'p1', status: TopParticipantStatus.CANCELLED });
    await expect(service.cancelParticipant('top-1', 'p1')).resolves.toMatchObject({ status: TopParticipantStatus.CANCELLED });
    prisma.topServant.findFirst.mockResolvedValueOnce({ id: 's1', topEventId: 'top-1' });
    prisma.topServant.update.mockResolvedValueOnce({ id: 's1', status: TopServantStatus.CANCELLED });
    await expect(service.cancelServant('top-1', 's1')).resolves.toMatchObject({ status: TopServantStatus.CANCELLED });
  });

  describe('participantOptions', () => {
    beforeEach(() => {
      prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
      prisma.topParticipant.findMany.mockResolvedValue([]);
    });

    it('busca por searchText normalizado (sem acento/caixa), não por fullName', async () => {
      await service.participantOptions('top-1', { search: 'João', limit: 20 } as any);
      const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
      expect(where.legendary).toEqual({ searchText: { contains: 'joao' } });
    });

    it('termo vazio/em branco não adiciona clause de searchText (regressão contains vazio)', async () => {
      await service.participantOptions('top-1', { search: '   ', limit: 20 } as any);
      const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
      expect(where.legendary).toBeUndefined();
    });

    it('sempre exclui participante cancelado/excluído do TOP da rota', async () => {
      await service.participantOptions('top-1', { limit: 20 } as any);
      const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
      expect(where.topEventId).toBe('top-1');
      expect(where.deletedAt).toBeNull();
      expect(where.status).toEqual({ not: TopParticipantStatus.CANCELLED });
    });

    it('availableForFamily=true omite quem já pertence a Família ativa no mesmo TOP', async () => {
      await service.participantOptions('top-1', { availableForFamily: true, limit: 20 } as any);
      const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
      expect(where.familyMemberships).toEqual({ none: { status: TopFamilyMemberStatus.ACTIVE, deletedAt: null } });
    });

    it('sem availableForFamily preserva o comportamento compatível (sem filtro de Família)', async () => {
      await service.participantOptions('top-1', { limit: 20 } as any);
      const where = prisma.topParticipant.findMany.mock.calls[0][0].where;
      expect(where.familyMemberships).toBeUndefined();
    });

    it('respeita o limite solicitado e retorna payload enxuto com value = TopParticipant.id', async () => {
      prisma.topParticipant.findMany.mockResolvedValueOnce([
        { id: 'p1', legendaryId: 'l1', legendary: { id: 'l1', fullName: 'João Silva', lgndNumber: 'A12', city: 'Goiânia' } },
      ]);
      const result = await service.participantOptions('top-1', { search: 'joao', limit: 5 } as any);
      expect(prisma.topParticipant.findMany.mock.calls[0][0].take).toBe(5);
      expect(result[0]).toMatchObject({
        value: 'p1',
        metadata: { legendaryId: 'l1', fullName: 'João Silva', lgndNumber: 'A12', city: 'Goiânia' },
      });
    });
  });

  describe('addFamilyMember revalida elegibilidade no backend', () => {
    beforeEach(() => {
      prisma.topFamily.findFirst.mockResolvedValue({ id: 'fam-1', topEventId: 'top-1', name: 'Família A' });
    });

    it('rejeita participante que já está em Família ativa (corrida/requisição manual)', async () => {
      prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'pp-1', legendaryId: 'l1' });
      prisma.topFamilyMember.findFirst.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.addFamilyMember('top-1', 'fam-1', { topParticipantId: 'pp-1' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita participante inativo/cancelado do TOP', async () => {
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.addFamilyMember('top-1', 'fam-1', { topParticipantId: 'pp-x' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('candidatos a participante e servo do TOP', () => {
    const adminUser = { sub: 'admin-1', email: 'a@x.com', roles: ['COORDINATION_ADMIN'], permissions: [] } as any;

    /** O TOP existe e tem cidade — o `TopScopeGuard` já cuidou do escopo antes do service. */
    function parentTopIsReachable(city: string | null = 'Goiânia') {
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', name: 'TOP 10', city });
    }

    it('TOP inexistente é 404 antes de consultar candidatos', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce(null);

      await expect(service.participantCandidateOptions('top-1', { limit: 20 } as any, adminUser)).rejects.toThrow();
      expect(prisma.legendary.findMany).not.toHaveBeenCalled();
    });

    it.each([
      ['participantCandidateOptions'],
      ['servantCandidateOptions'],
    ])('%s exclui participantes E servos ativos (os papéis são mutuamente exclusivos)', async (method) => {
      parentTopIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await (service as any)[method]('top-1', { limit: 20 }, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.topParticipants).toEqual({
        none: { topEventId: 'top-1', deletedAt: null, status: { not: TopParticipantStatus.CANCELLED } },
      });
      expect(call[0].where.topServants).toEqual({
        none: { topEventId: 'top-1', deletedAt: null, status: { not: TopServantStatus.CANCELLED } },
      });
      expect(call[0].where.status).toEqual({ not: 'INACTIVE' });
    });

    // Participação em TOP independe da cidade do Legendário: qualquer um pode ir a qualquer TOP,
    // de qualquer rota. Herdar a cidade do TOP escondia 99 de 242 candidatos na homologação.
    it('NÃO herda a cidade do TOP como filtro', async () => {
      parentTopIsReachable('Goiânia');
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.participantCandidateOptions('top-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.city).toBeUndefined();
    });

    it('filtra por cidade só quando o cliente pede', async () => {
      parentTopIsReachable('Goiânia');
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.participantCandidateOptions('top-1', { city: 'Anápolis', limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.city).toEqual({ contains: 'Anápolis', mode: 'insensitive' });
    });

    it('não amplia o diretório: aplica o mesmo recorte geográfico do endpoint global', async () => {
      const scopeFilter = { OR: [{ churchId: { in: ['church-1'] } }] };
      parentTopIsReachable();
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false, topIds: ['top-1'] });
      accessPolicy.buildLegendaryWhere.mockReturnValueOnce(scopeFilter);
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.participantCandidateOptions('top-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.AND).toContainEqual(scopeFilter);
    });

    it('projeta o mínimo e ordena de forma determinística', async () => {
      parentTopIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'legendary-1', fullName: 'Ana Souza', lgndNumber: '1234', city: 'Goiânia' },
      ]);

      const result = await service.participantCandidateOptions('top-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].select).toEqual({ id: true, fullName: true, lgndNumber: true, city: true });
      expect(call[0].orderBy).toEqual([{ fullName: 'asc' }, { id: 'asc' }]);
      expect(result).toEqual([
        {
          id: 'legendary-1',
          label: 'Ana Souza - LGND 1234',
          value: 'legendary-1',
          metadata: { fullName: 'Ana Souza', lgndNumber: '1234', city: 'Goiânia' },
        },
      ]);
      // Cidade É a dimensão de elegibilidade aqui, então entra. PII de contato, nunca.
      const serialized = JSON.stringify(result);
      ['email', 'phone', 'birthDate', 'address', 'notes'].forEach((field) => {
        expect(serialized).not.toContain(field);
      });
    });

    it('busca pelo `searchText` normalizado, e termo vazio não vira clause', async () => {
      parentTopIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);
      await service.participantCandidateOptions('top-1', { search: '  Ângela ', limit: 20 } as any, adminUser);
      expect(prisma.legendary.findMany.mock.calls[0][0].where.searchText).toEqual({ contains: 'angela' });

      prisma.legendary.findMany.mockReset();
      parentTopIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);
      await service.participantCandidateOptions('top-1', { search: '   ', limit: 20 } as any, adminUser);
      expect(prisma.legendary.findMany.mock.calls[0][0].where.searchText).toBeUndefined();
    });
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

  // Invariante, não caso de exemplo: o defeito real foi um builder inteiro montar a
  // árvore sem `refId`, e nenhum teste de exemplo pegou. Aqui percorre-se a árvore
  // completa das três visões — um ramo novo esquecido cai neste teste.
  describe('toda pessoa da árvore é identificável (refId)', () => {
    const coletar = (node: any, acc: any[] = []) => {
      acc.push(node);
      node.children.forEach((c: any) => coletar(c, acc));
      return acc;
    };
    const pessoas = (root: any) => coletar(root).filter((n) => n.kind === 'person' || n.kind === 'leader');
    const estruturais = (root: any) => coletar(root).filter((n) => ['root', 'group', 'city'].includes(n.kind));

    function popularTudo() {
      prisma.topTeam.findMany.mockResolvedValue([
        { id: 'tt1', teamId: 'team-a', team: { name: 'Equipe A' }, coordinatorLegendaryId: 'lg-coord', coordinator: { fullName: 'Coord' }, deputyCoordinatorLegendaryId: 'lg-vice', deputyCoordinator: { fullName: 'Vice' } },
      ]);
      prisma.topServant.findMany.mockResolvedValue([
        { id: 's1', teamId: 'team-a', legendaryId: 'lg-s1', legendary: { fullName: 'Servo 1' }, role: 'Cozinha' },
        { id: 's2', teamId: null, legendaryId: 'lg-s2', legendary: { fullName: 'Servo Solto' } },
      ]);
      prisma.topFamily.findMany.mockResolvedValue([
        {
          id: 'f1',
          name: 'Familia Leao',
          representativeLegendaryId: 'lg-rep',
          representative: { fullName: 'Chefe' },
          deputyRepresentativeLegendaryId: 'lg-virep',
          deputyRepresentative: { fullName: 'Vice-chefe' },
          members: [{ id: 'm1', topParticipant: { legendaryId: 'lg-m1', legendary: { fullName: 'Membro 1' } } }],
        },
      ]);
      prisma.topParticipant.findMany.mockResolvedValue([
        { id: 'p1', legendaryId: 'lg-p1', legendary: { fullName: 'A', city: 'Goiânia' } },
        { id: 'p2', legendaryId: 'lg-p2', legendary: { fullName: 'B', city: null } },
      ]);
    }

    it.each(['teams', 'families', 'cities'] as const)('visão "%s": todo nó person/leader traz refId', async (view) => {
      popularTudo();

      const root = await service.getOrgChart('top-1', view);
      const nos = pessoas(root);

      expect(nos.length).toBeGreaterThan(0);
      const semRefId = nos.filter((n) => !n.refId).map((n) => `${n.kind}:${n.id}`);
      expect(semRefId).toEqual([]);
    });

    it.each(['teams', 'families', 'cities'] as const)('visão "%s": nó estrutural não traz refId', async (view) => {
      popularTudo();

      const root = await service.getOrgChart('top-1', view);

      expect(estruturais(root).filter((n) => n.refId)).toEqual([]);
    });

    it('registro sem Legendário vinculado vira nó sem refId, sem quebrar', async () => {
      prisma.topServant.findMany.mockResolvedValueOnce([{ id: 's-orfao', teamId: null, legendaryId: null, legendary: null }]);

      const root = await service.getOrgChart('top-1', 'teams');
      const orfao = pessoas(root).find((n) => n.id === 'servant:s-orfao')!;

      expect(orfao.label).toBe('Sem nome');
      expect(orfao.refId).toBeUndefined();
    });

    it('o refId é o id do Legendário, não o id do vínculo — é ele que o painel consulta', async () => {
      popularTudo();

      const root = await service.getOrgChart('top-1', 'teams');
      const servo = pessoas(root).find((n) => n.id === 'servant:s1')!;
      const coord = pessoas(root).find((n) => n.id === 'leader:tt1')!;

      expect(servo.refId).toBe('lg-s1');
      expect(coord.refId).toBe('lg-coord');
    });
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
