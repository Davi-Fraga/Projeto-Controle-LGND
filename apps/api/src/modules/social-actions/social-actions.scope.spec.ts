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
});
