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
      },
    };
    audit = { create: jest.fn() };
    accessPolicy = { resolveScope: jest.fn(), buildCityWhere: jest.fn().mockReturnValue({ __city: true }) };
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
});
