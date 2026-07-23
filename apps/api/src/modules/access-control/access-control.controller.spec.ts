import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@central-da-manada/shared';
import { AccessControlController } from './access-control.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';

// Escalonamento de privilégio (change access-scope-semantics-hardening, tarefa 1.1):
// administrar acessos SHALL exigir o papel administrativo — nunca ser alcançável pela
// permissão `users.update` (senão conceder "Usuários Ver e editar" vira auto-escalonamento).
describe('AccessControlController authorization', () => {
  const handlerNames = Object.getOwnPropertyNames(AccessControlController.prototype).filter(
    (name) => name !== 'constructor',
  );

  it('is guarded by RolesGuard requiring COORDINATION_ADMIN', () => {
    const guards = (Reflect.getMetadata(GUARDS_METADATA, AccessControlController) ?? []) as unknown[];
    expect(guards).toContain(RolesGuard);

    const roles = Reflect.getMetadata(ROLES_KEY, AccessControlController);
    expect(roles).toEqual([SystemRole.COORDINATION_ADMIN]);
  });

  it('does not gate any handler by users.* permissions (no escalation vector)', () => {
    for (const name of handlerNames) {
      const handler = (AccessControlController.prototype as unknown as Record<string, unknown>)[name];
      const perms = (Reflect.getMetadata(PERMISSIONS_KEY, handler as object) ?? []) as string[];
      expect(perms).not.toContain('users.update');
      expect(perms).not.toContain('users.read');
    }
  });

  it('RolesGuard denies a non-admin even holding users.update, and allows the admin', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([SystemRole.COORDINATION_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const makeCtx = (roles: string[]) =>
      ({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', roles, permissions: ['users.update'] } }) }),
      }) as any;

    expect(guard.canActivate(makeCtx(['SPIRITUAL_LEADER']))).toBe(false);
    expect(guard.canActivate(makeCtx([SystemRole.COORDINATION_ADMIN]))).toBe(true);
  });
});
