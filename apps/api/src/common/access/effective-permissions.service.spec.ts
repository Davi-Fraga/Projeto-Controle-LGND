import { EffectivePermissionsService } from './effective-permissions.service';

function userWith(
  roleName: string,
  rolePermissionKeys: string[],
  overrides: { key: string; effect: 'GRANT' | 'REVOKE' }[] = [],
) {
  return {
    roles: [
      {
        role: {
          name: roleName,
          permissions: rolePermissionKeys.map((key) => ({ permission: { key } })),
        },
      },
    ],
    permissionOverrides: overrides.map((o) => ({ effect: o.effect, permission: { key: o.key } })),
  };
}

describe('EffectivePermissionsService (função não concede; base só p/ admin)', () => {
  let prisma: any;
  let service: EffectivePermissionsService;

  beforeEach(() => {
    prisma = { user: { findFirst: jest.fn() } };
    service = new EffectivePermissionsService(prisma);
  });

  it('Administrador recebe as permissions do papel como base', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      userWith('COORDINATION_ADMIN', ['legendarios.read', 'churches.read']),
    );
    const keys = await service.resolveKeys('u1');
    expect(keys.sort()).toEqual(['churches.read', 'legendarios.read']);
  });

  it('função (não-admin) NÃO concede nada por si só', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      userWith('TEAM_COORDINATOR', ['teams.read', 'teams.members.read']),
    );
    const keys = await service.resolveKeys('u1');
    expect(keys).toEqual([]); // papel ignorado para não-admin
  });

  it('não-admin: efetivas = concessões por tela', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      userWith('MEMBER', [], [{ key: 'legendarios.read', effect: 'GRANT' }]),
    );
    const keys = await service.resolveKeys('u1');
    expect(keys).toEqual(['legendarios.read']);
  });

  it('não-admin: revogação remove uma concessão', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      userWith('MEMBER', [], [
        { key: 'legendarios.read', effect: 'GRANT' },
        { key: 'legendarios.read', effect: 'REVOKE' },
      ]),
    );
    // Override é único por permission (o REVOKE prevalece na fórmula final).
    const keys = await service.resolveKeys('u1');
    expect(keys).toEqual([]);
  });

  it('Administrador: base do papel − revogação', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(
      userWith('COORDINATION_ADMIN', ['a', 'b'], [{ key: 'b', effect: 'REVOKE' }]),
    );
    const keys = await service.resolveKeys('u1');
    expect(keys).toEqual(['a']);
  });

  it('retorna vazio para usuário inexistente/inativo', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    expect(await service.resolveKeys('ghost')).toEqual([]);
  });
});
