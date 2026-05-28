import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  it('allows users with all required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legendarios.read']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context: any = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: ['legendarios.read'] } }),
      }),
    };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks users without required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legendarios.create']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context: any = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: ['legendarios.read'] } }),
      }),
    };

    expect(guard.canActivate(context)).toBe(false);
  });
});
