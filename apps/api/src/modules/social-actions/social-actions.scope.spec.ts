import { NotFoundException } from '@nestjs/common';
import { SocialActionsService } from './social-actions.service';

// Contrato de escopo/IDOR da tela Ações Sociais (change access-scope-semantics-hardening):
// escopo por cidade (buildCityWhere) é fail-closed; detalhe por id fora do escopo → 404.
describe('SocialActionsService (escopo/IDOR)', () => {
  let prisma: any;
  let audit: any;
  let accessPolicy: any;
  let service: SocialActionsService;
  const user = { sub: 'u1' } as any;

  beforeEach(() => {
    prisma = {
      socialAction: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      socialActionParticipant: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      legendary: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      legendaryHistory: { create: jest.fn(), createMany: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildCityWhere: jest.fn().mockReturnValue({ __city: true }),
      buildLegendaryWhere: jest.fn().mockReturnValue({ __legendary: true }),
    };
    service = new SocialActionsService(prisma, audit, accessPolicy);
  });

  it('findOne fora do escopo de cidade retorna 404 (IDOR)', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
    prisma.socialAction.findFirst.mockResolvedValue(null);

    await expect(service.findOne('a1', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(JSON.stringify(prisma.socialAction.findFirst.mock.calls[0][0].where)).toContain('__city');
  });

  it('findAll aplica o escopo de cidade (fail-closed) para não-admin', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });

    await service.findAll({} as any, user);

    expect(JSON.stringify(prisma.socialAction.findMany.mock.calls[0][0].where)).toContain('__city');
  });

  it('admin: findAll sem filtro de cidade', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

    await service.findAll({} as any, user);

    expect(prisma.socialAction.findMany.mock.calls[0][0].where.AND).toBeUndefined();
  });

  it('não altera ação fora do escopo e responde 404 antes da escrita', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
    prisma.socialAction.findFirst.mockResolvedValue(null);

    await expect(
      service.update('action-external', { title: 'Nope' } as any, user),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.socialAction.update).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('não adiciona participante geograficamente externo', async () => {
    const scope = { isAdmin: false, cityKeys: ['goiania'], legendaryCities: ['Goiânia'] };
    accessPolicy.resolveScope.mockResolvedValue(scope);
    prisma.socialAction.findFirst.mockResolvedValue({
      id: 'action-1',
      title: 'Ação',
      _count: { participants: 0 },
    });
    prisma.legendary.findFirst.mockResolvedValue(null);

    await expect(
      service.addParticipant('action-1', { legendaryId: 'legendary-external' } as any, user),
    ).rejects.toThrow('Legendary does not exist.');

    expect(prisma.legendary.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'legendary-external',
        deletedAt: null,
        AND: [{ __legendary: true }],
      },
    });
    expect(prisma.socialActionParticipant.create).not.toHaveBeenCalled();
  });

  it('sugestões aplicam geografia e retornam somente a projeção mínima sem PII', async () => {
    accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
    prisma.legendary.findMany.mockResolvedValue([
      {
        id: 'l1',
        fullName: 'Voluntário',
        lgndNumber: '123',
        city: 'Goiânia',
        profession: { id: 'p1', name: 'Médico' },
      },
    ]);
    prisma.legendary.count.mockResolvedValue(1);

    const result = await service.suggestions({ page: 1, perPage: 10 } as any, user);

    expect(prisma.legendary.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: [{ __legendary: true }] }),
      select: {
        id: true,
        fullName: true,
        lgndNumber: true,
        city: true,
        profession: { select: { id: true, name: true } },
      },
    }));
    expect(result.data[0]).toEqual({
      id: 'l1',
      fullName: 'Voluntário',
      lgndNumber: '123',
      city: 'Goiânia',
      profession: { id: 'p1', name: 'Médico' },
    });
    expect(result.data[0]).not.toHaveProperty('phone');
    expect(result.data[0]).not.toHaveProperty('email');
  });

  describe('participantCandidateOptions', () => {
    it('ação fora do escopo de cidade é 404 antes de consultar candidatos', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      prisma.socialAction.findFirst.mockResolvedValue(null);

      await expect(service.participantCandidateOptions('sa-1', { limit: 20 } as any, user))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.legendary.findMany).not.toHaveBeenCalled();
    });

    it('exclui quem já participa da ação e os inativos', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
      prisma.socialAction.findFirst.mockResolvedValue({ id: 'sa-1', city: 'Goiânia' });

      await service.participantCandidateOptions('sa-1', { limit: 20 } as any, user);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.socialActionParticipants).toEqual({
        none: { socialActionId: 'sa-1', deletedAt: null, status: { not: 'CANCELLED' } },
      });
      expect(call[0].where.status).toEqual({ not: 'INACTIVE' });
    });

    it('não herda a cidade da ação; filtra só quando o cliente pede', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
      prisma.socialAction.findFirst.mockResolvedValue({ id: 'sa-1', city: 'Goiânia' });

      await service.participantCandidateOptions('sa-1', { limit: 20 } as any, user);
      expect(prisma.legendary.findMany.mock.calls[0][0].where.city).toBeUndefined();

      prisma.legendary.findMany.mockClear();
      await service.participantCandidateOptions('sa-1', { city: 'Anápolis', limit: 20 } as any, user);
      expect(prisma.legendary.findMany.mock.calls[0][0].where.city).toEqual({ contains: 'Anápolis', mode: 'insensitive' });
    });

    it('não amplia o diretório: aplica o recorte de Legendários do escopo', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      prisma.socialAction.findFirst.mockResolvedValue({ id: 'sa-1', city: 'Goiânia' });

      await service.participantCandidateOptions('sa-1', { limit: 20 } as any, user);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].where.AND).toContainEqual({ __legendary: true });
    });

    it('projeta o mínimo, sem PII de contato', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
      prisma.socialAction.findFirst.mockResolvedValue({ id: 'sa-1', city: 'Goiânia' });
      prisma.legendary.findMany.mockResolvedValueOnce([
        { id: 'l1', fullName: 'Ana Souza', lgndNumber: '123', city: 'Goiânia' },
      ]);

      const result = await service.participantCandidateOptions('sa-1', { limit: 20 } as any, user);

      const [call] = prisma.legendary.findMany.mock.calls;
      expect(call[0].select).toEqual({ id: true, fullName: true, lgndNumber: true, city: true });
      expect(call[0].orderBy).toEqual([{ fullName: 'asc' }, { id: 'asc' }]);
      expect(result[0]).toEqual({
        id: 'l1',
        label: 'Ana Souza - LGND 123',
        value: 'l1',
        metadata: { fullName: 'Ana Souza', lgndNumber: '123', city: 'Goiânia' },
      });
      expect(JSON.stringify(result)).not.toContain('phone');
      expect(JSON.stringify(result)).not.toContain('email');
    });
  });
});
