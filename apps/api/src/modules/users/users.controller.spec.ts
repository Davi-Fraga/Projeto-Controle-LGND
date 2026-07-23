import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { SystemRole } from '@central-da-manada/shared';
import { UsersController } from './users.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

// Gestão de usuários é admin-only (change access-scope-semantics-hardening, tarefa 1.3),
// exceto `/users/me` (perfil próprio, aberto a qualquer autenticado).
describe('UsersController authorization', () => {
  const proto = UsersController.prototype as unknown as Record<string, unknown>;
  const rolesOf = (method: string) => Reflect.getMetadata(ROLES_KEY, proto[method] as object);

  it('is guarded by RolesGuard', () => {
    const guards = (Reflect.getMetadata(GUARDS_METADATA, UsersController) ?? []) as unknown[];
    expect(guards).toContain(RolesGuard);
  });

  it('requires COORDINATION_ADMIN on user administration handlers', () => {
    for (const method of ['findAll', 'findOne', 'update', 'deactivate']) {
      expect(rolesOf(method)).toEqual([SystemRole.COORDINATION_ADMIN]);
    }
  });

  it('leaves /users/me open to any authenticated user', () => {
    expect(rolesOf('me')).toBeUndefined();
  });
});
