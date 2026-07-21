import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { EffectivePermissionsService } from '../access/effective-permissions.service';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';

function makeContext(user: unknown) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('PermissionsGuard', () => {
  it('allows users whose effective permissions include all required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legendarios.read']),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(['legendarios.read']),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('blocks users whose effective permissions miss a required one', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legendarios.create']),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(['legendarios.read']),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(false);
  });

  it('allows users with any one of the alternative permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => key === ANY_PERMISSIONS_KEY
        ? ['legendarios.read', 'teams.members.read']
        : undefined),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(['teams.members.read']),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('blocks users missing every alternative permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => key === ANY_PERMISSIONS_KEY
        ? ['legendarios.read', 'teams.members.read']
        : undefined),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(['teams.read']),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(false);
  });

  it('preserves all-of requirements when alternative permissions are absent', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key) => key === PERMISSIONS_KEY
        ? ['legendarios.read', 'legendarios.update']
        : undefined),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(['legendarios.read']),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(false);
  });

  it('reflects a revocation in the active session (no relogin)', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legendarios.read']),
    } as unknown as Reflector;
    // Token ainda carrega a permission, mas o banco já a revogou.
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue([]),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);
    const user = { sub: 'u1', permissions: ['legendarios.read'] };

    await expect(guard.canActivate(makeContext(user))).resolves.toBe(false);
    // O request é atualizado com as efetivas atuais.
    expect(user.permissions).toEqual([]);
  });

  it('allows endpoints without required permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const effective = {
      resolveKeys: jest.fn(),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(reflector, effective);

    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(true);
    expect(effective.resolveKeys).not.toHaveBeenCalled();
  });
});
