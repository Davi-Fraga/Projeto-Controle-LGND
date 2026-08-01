import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamMembershipStatus, TeamStatus } from '@central-da-manada/shared';
import { TeamsService } from './teams.service';

const adminUser = { sub: 'admin-id', email: 'admin@example.com', roles: ['COORDINATION_ADMIN'], permissions: [] };
const coordinatorUser = { sub: 'coord-id', email: 'coord@example.com', legendaryId: 'legendary-1', roles: ['TEAM_COORDINATOR'], permissions: [] };

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      team: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      legendary: { findFirst: jest.fn(), findMany: jest.fn() },
      teamMembership: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] }),
      buildTeamWhere: jest.fn(),
      buildLegendaryWhere: jest.fn(),
      assertTeamAllowed: jest.fn(),
    };
    service = new TeamsService(prisma, audit, accessPolicy);
  });

  it('findAll admin sees all without scope filter', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findMany.mockResolvedValueOnce([{ id: 'team-1', name: 'Midia', _count: { memberships: 0 } }]);
    prisma.team.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, perPage: 10 }, adminUser);

    expect(result.meta.total).toBe(1);
    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
    const [findManyCall] = prisma.team.findMany.mock.calls;
    expect(findManyCall[0].where.AND).toBeUndefined();
  });

  it('findAll scopes teams for coordinator via AND filter', async () => {
    const scopeFilter = { id: { in: ['team-1'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce(scopeFilter);
    prisma.team.findMany.mockResolvedValueOnce([]);
    prisma.team.count.mockResolvedValueOnce(0);

    await service.findAll({ page: 1, perPage: 10 }, coordinatorUser);

    const [findManyCall] = prisma.team.findMany.mock.calls;
    expect(findManyCall[0].where.AND).toContainEqual(scopeFilter);
  });

  it('findOne returns 404 when team is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['other-team'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce({ id: { in: ['other-team'] } });
    prisma.team.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne('team-1', coordinatorUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne succeeds for admin regardless of scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });

    const result = await service.findOne('team-1', adminUser);

    expect(result.name).toBe('Midia');
    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
  });

  it('options applies the team scope for a restricted user', async () => {
    const scopeFilter = { id: { in: ['team-1'] } };
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
    accessPolicy.buildTeamWhere.mockReturnValueOnce(scopeFilter);
    prisma.team.findMany.mockResolvedValueOnce([{ id: 'team-1', name: 'Midia', status: TeamStatus.ACTIVE }]);

    const result = await service.options({ search: 'mid', limit: 5 }, coordinatorUser);

    expect(prisma.team.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        name: { contains: 'mid', mode: 'insensitive' },
        AND: [scopeFilter],
      }),
      take: 5,
    }));
    expect(result).toEqual([expect.objectContaining({ value: 'team-1', label: 'Midia' })]);
  });

  it('options keeps administrators unrestricted', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findMany.mockResolvedValueOnce([]);

    await service.options({ limit: 20 }, adminUser);

    expect(accessPolicy.buildTeamWhere).not.toHaveBeenCalled();
    expect(prisma.team.findMany.mock.calls[0][0].where.AND).toBeUndefined();
  });

  it('findMembers returns 404 when teamId is outside scope', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['other-team'], legendaryIds: [] });
    accessPolicy.assertTeamAllowed.mockImplementationOnce(() => {
      throw new ForbiddenException('Team out of scope.');
    });

    await expect(
      service.findMembers('team-1', { page: 1, perPage: 10 }, coordinatorUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.team.findFirst).not.toHaveBeenCalled();
    expect(prisma.teamMembership.findMany).not.toHaveBeenCalled();
  });

  it('findMembers accepts TEAM=ALL through the canonical assertion', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      teamIds: [],
      allTeams: true,
    });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-any', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findMany.mockResolvedValueOnce([]);
    prisma.teamMembership.count.mockResolvedValueOnce(0);

    await expect(
      service.findMembers('team-any', { page: 1, perPage: 10 }, coordinatorUser),
    ).resolves.toEqual(expect.objectContaining({ data: [] }));

    expect(accessPolicy.assertTeamAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ allTeams: true }),
      'team-any',
    );
  });

  it('findMembers succeeds for admin for any team', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findMany.mockResolvedValueOnce([]);
    prisma.teamMembership.count.mockResolvedValueOnce(0);

    const result = await service.findMembers('team-1', { page: 1, perPage: 10 }, adminUser);

    expect(result.data).toEqual([]);
  });

  it('findMembers busca telefone nos formatos legado e canônico sem cláusula vazia', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true, churchIds: [], teamIds: [], legendaryIds: [] });
    prisma.team.findFirst.mockResolvedValue({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findMany.mockResolvedValue([]);
    prisma.teamMembership.count.mockResolvedValue(0);

    await service.findMembers('team-1', { page: 1, perPage: 10, search: '64992485187' }, adminUser);

    const or = prisma.teamMembership.findMany.mock.calls[0][0].where.legendary.OR;
    expect(or).toContainEqual({ phone: { contains: '64992485187', mode: 'insensitive' } });
    expect(or).toContainEqual({ phone: { contains: '(64) 99248-5187', mode: 'insensitive' } });

    await service.findMembers('team-1', { page: 1, perPage: 10, search: 'João' }, adminUser);
    const textOr = prisma.teamMembership.findMany.mock.calls[1][0].where.legendary.OR;
    expect(textOr.some((clause: any) => clause.phone?.contains === '')).toBe(false);
  });

  it('creates a team', async () => {
    prisma.team.findFirst.mockResolvedValueOnce(null);
    prisma.team.create.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      status: TeamStatus.ACTIVE,
      _count: { memberships: 0 },
    });

    const result = await service.create({ name: 'Midia' });

    expect(result.name).toBe('Midia');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('blocks duplicated active team name', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'existing', name: 'Midia' });

    await expect(service.create({ name: 'Midia' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates team coordinators', async () => {
    prisma.team.findFirst
      .mockResolvedValueOnce({
        id: 'team-1',
        name: 'Midia',
        coordinatorLegendaryId: null,
        deputyCoordinatorLegendaryId: null,
        _count: { memberships: 0 },
      })
      .mockResolvedValueOnce(null);
    prisma.legendary.findFirst
      .mockResolvedValueOnce({ id: 'legendary-1' })
      .mockResolvedValueOnce({ id: 'legendary-2' });
    prisma.team.update.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      coordinatorLegendaryId: 'legendary-1',
      deputyCoordinatorLegendaryId: 'legendary-2',
      _count: { memberships: 0 },
    });

    const result = await service.update('team-1', {
      coordinatorLegendaryId: 'legendary-1',
      deputyCoordinatorLegendaryId: 'legendary-2',
    }, adminUser);

    expect(result.coordinatorLegendaryId).toBe('legendary-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_coordinator' }));
  });

  it('blocks same coordinator and deputy coordinator', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia',
      _count: { memberships: 0 },
    });

    await expect(
      service.update('team-1', {
        coordinatorLegendaryId: 'legendary-1',
        deputyCoordinatorLegendaryId: 'legendary-1',
      }, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds a team member', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'legendary-1' });
    prisma.teamMembership.findFirst.mockResolvedValueOnce(null);
    prisma.teamMembership.create.mockResolvedValueOnce({
      id: 'membership-1',
      teamId: 'team-1',
      legendaryId: 'legendary-1',
      role: 'Editor',
      status: TeamMembershipStatus.ACTIVE,
    });

    const result = await service.addMember('team-1', {
      legendaryId: 'legendary-1',
      role: 'Editor',
    }, adminUser);

    expect(result.role).toBe('Editor');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'add_member' }));
  });

  it('blocks duplicated active membership', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'legendary-1' });
    prisma.teamMembership.findFirst.mockResolvedValueOnce({ id: 'membership-1' });

    await expect(
      service.addMember('team-1', {
        legendaryId: 'legendary-1',
        role: 'Editor',
      }, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates a member preserving history', async () => {
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia', _count: { memberships: 0 } });
    prisma.teamMembership.findFirst.mockResolvedValueOnce({
      id: 'membership-1',
      teamId: 'team-1',
      role: 'Editor',
      endedAt: null,
    });
    prisma.teamMembership.update.mockResolvedValueOnce({
      id: 'membership-1',
      status: TeamMembershipStatus.INACTIVE,
      endedAt: new Date(),
    });

    const result = await service.deactivateMember('team-1', 'membership-1', adminUser);

    expect(result.status).toBe(TeamMembershipStatus.INACTIVE);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'deactivate_member' }));
  });

  it('does not update a team outside the effective scope and returns 404', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      teamIds: ['team-derived'],
    });
    accessPolicy.assertTeamAllowed.mockImplementationOnce(() => {
      throw new ForbiddenException('Team out of scope.');
    });

    await expect(
      service.update('team-external', { name: 'Nope' }, coordinatorUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.team.findFirst).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('stops every scoped mutation before writes when the parent team is external', async () => {
    const attempts = [
      () => service.deactivate('team-external', coordinatorUser),
      () => service.restore('team-external', coordinatorUser),
      () => service.addMember('team-external', { legendaryId: 'l1', role: 'Editor' }, coordinatorUser),
      () => service.updateMember('team-external', 'membership-1', { role: 'Lead' }, coordinatorUser),
      () => service.deactivateMember('team-external', 'membership-1', coordinatorUser),
    ];

    for (const attempt of attempts) {
      accessPolicy.resolveScope.mockResolvedValueOnce({
        isAdmin: false,
        teamIds: ['team-allowed'],
      });
      accessPolicy.assertTeamAllowed.mockImplementationOnce(() => {
        throw new ForbiddenException('Team out of scope.');
      });
      await expect(attempt()).rejects.toBeInstanceOf(NotFoundException);
    }

    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(prisma.teamMembership.create).not.toHaveBeenCalled();
    expect(prisma.teamMembership.update).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('allows an update with TEAM=ALL and keeps the authenticated audit actor', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      teamIds: [],
      allTeams: true,
    });
    prisma.team.findFirst.mockResolvedValueOnce({
      id: 'team-any',
      name: 'Midia',
      description: null,
      coordinatorLegendaryId: null,
      deputyCoordinatorLegendaryId: null,
      _count: { memberships: 0 },
    });
    prisma.team.update.mockResolvedValueOnce({
      id: 'team-any',
      name: 'Midia',
      description: 'Nova',
      coordinatorLegendaryId: null,
      deputyCoordinatorLegendaryId: null,
      _count: { memberships: 0 },
    });

    await service.update('team-any', { description: 'Nova' }, coordinatorUser);

    expect(accessPolicy.assertTeamAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ allTeams: true }),
      'team-any',
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: coordinatorUser.sub }),
    );
  });

  it('uses the authenticated user as audit actor for an in-scope derived team', async () => {
    accessPolicy.resolveScope.mockResolvedValueOnce({
      isAdmin: false,
      teamIds: ['team-1'],
    });
    prisma.team.findFirst
      .mockResolvedValueOnce({
        id: 'team-1',
        name: 'Midia',
        coordinatorLegendaryId: null,
        deputyCoordinatorLegendaryId: null,
        _count: { memberships: 0 },
      })
      .mockResolvedValueOnce(null);
    prisma.team.update.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Midia Nova',
      coordinatorLegendaryId: null,
      deputyCoordinatorLegendaryId: null,
      _count: { memberships: 0 },
    });

    await service.update('team-1', { name: 'Midia Nova' }, coordinatorUser);

    expect(accessPolicy.assertTeamAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: ['team-1'] }),
      'team-1',
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: coordinatorUser.sub, action: 'update' }),
    );
  });

  describe('memberCandidateOptions', () => {
    /** Deixa a equipe-pai visível e existente, para isolar o que cada teste quer provar. */
    function parentTeamIsReachable() {
      prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1', name: 'Midia' });
    }

    it('valida o pai ANTES de consultar candidatos: equipe fora do escopo é 404', async () => {
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false, churchIds: [], teamIds: ['other-team'], legendaryIds: [] });
      accessPolicy.assertTeamAllowed.mockImplementationOnce(() => {
        throw new ForbiddenException();
      });

      await expect(service.memberCandidateOptions('team-1', { limit: 20 } as any, coordinatorUser))
        .rejects.toBeInstanceOf(NotFoundException);
      // O ponto do teste: nenhuma pessoa foi consultada para um pai inacessível.
      expect(prisma.legendary.findMany).not.toHaveBeenCalled();
    });

    it('equipe inexistente é 404 antes de consultar candidatos', async () => {
      prisma.team.findFirst.mockResolvedValueOnce(null);

      await expect(service.memberCandidateOptions('team-1', { limit: 20 } as any, adminUser))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.legendary.findMany).not.toHaveBeenCalled();
    });

    it('exclui quem já é membro ATIVO da equipe e os inativos', async () => {
      parentTeamIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.memberCandidateOptions('team-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.teamMemberships).toEqual({
        none: { teamId: 'team-1', deletedAt: null, status: TeamMembershipStatus.ACTIVE },
      });
      expect(call[0].where.status).toEqual({ not: 'INACTIVE' });
      expect(call[0].where.deletedAt).toBeNull();
    });

    it('não amplia o diretório: aplica o mesmo recorte geográfico do endpoint global', async () => {
      const scopeFilter = { OR: [{ city: { in: ['Goiânia'] } }] };
      parentTeamIsReachable();
      // `mockResolvedValue`, não `Once`: `assertTeamVisible` já consome uma resolução de escopo
      // antes de a busca de candidatos consumir a sua.
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false, churchIds: [], teamIds: ['team-1'], legendaryIds: [] });
      accessPolicy.buildLegendaryWhere.mockReturnValueOnce(scopeFilter);
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.memberCandidateOptions('team-1', { limit: 20 } as any, coordinatorUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.AND).toContainEqual(scopeFilter);
    });

    it('admin não recebe filtro de escopo', async () => {
      parentTeamIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.memberCandidateOptions('team-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.AND).toBeUndefined();
      expect(accessPolicy.buildLegendaryWhere).not.toHaveBeenCalled();
    });

    it('projeta o mínimo: sem e-mail, telefone, nascimento, endereço, cidade ou igreja', async () => {
      parentTeamIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'legendary-1', fullName: 'Ana Souza', lgndNumber: '1234' },
      ]);

      const result = await service.memberCandidateOptions('team-1', { limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].select).toEqual({ id: true, fullName: true, lgndNumber: true });
      expect(result).toEqual([
        {
          id: 'legendary-1',
          label: 'Ana Souza - LGND 1234',
          value: 'legendary-1',
          metadata: { fullName: 'Ana Souza', lgndNumber: '1234' },
        },
      ]);
      // Guarda explícita: a serialização não pode ganhar PII por descuido.
      const serialized = JSON.stringify(result);
      ['email', 'phone', 'birthDate', 'address', 'city', 'church', 'notes'].forEach((field) => {
        expect(serialized).not.toContain(field);
      });
    });

    it('usa a busca canônica normalizada, com limite e ordenação determinística', async () => {
      parentTeamIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.memberCandidateOptions('team-1', { search: '  Ângela  ', limit: 5 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      // `searchText` já agrega nome, cidade e LGND — mesmo caminho de `GET /legendarios`.
      expect(call[0].where.searchText).toEqual({ contains: 'angela' });
      expect(call[0].take).toBe(5);
      // `id` desempata homônimos — sem ele o corte por limite não é estável.
      expect(call[0].orderBy).toEqual([{ fullName: 'asc' }, { id: 'asc' }]);
    });

    it('busca vazia não vira clause (contains: "" casaria todo o diretório)', async () => {
      parentTeamIsReachable();
      prisma.legendary.findMany.mockResolvedValueOnce([]);

      await service.memberCandidateOptions('team-1', { search: '   ', limit: 20 } as any, adminUser);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.searchText).toBeUndefined();
    });
  });
});
