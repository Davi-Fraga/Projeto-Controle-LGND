import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@central-da-manada/shared';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PasswordResetController } from './password-reset.controller';

describe('PasswordResetController authorization', () => {
  const prototype = PasswordResetController.prototype;

  it('requires JWT and COORDINATION_ADMIN only for link generation', () => {
    const createGuards = (Reflect.getMetadata(GUARDS_METADATA, prototype.create) ?? []) as unknown[];
    expect(createGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, prototype.create)).toEqual([
      SystemRole.COORDINATION_ADMIN,
    ]);

    expect(Reflect.getMetadata(GUARDS_METADATA, prototype.validate)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, prototype.reset)).toBeUndefined();
  });

  it('denies a non-admin even when users.update remains in the token', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([SystemRole.COORDINATION_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'user-1',
            roles: ['SPIRITUAL_LEADER'],
            permissions: ['users.update'],
          },
        }),
      }),
    } as any;

    expect(guard.canActivate(context)).toBe(false);
  });
});
