import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EffectivePermissionsService } from '../../common/access/effective-permissions.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LEGENDARY_OPTIONS_PERMISSIONS, LegendariosController } from './legendarios.controller';
import { LegendariosService } from './legendarios.service';

describe('LegendariosController', () => {
  const user: AuthenticatedUser = {
    sub: 'user-1',
    email: 'coordinator@example.com',
    roles: ['TEAM_COORDINATOR'],
    permissions: ['organogram.person.edit'],
  };

  const dto = { fullName: 'Nome atualizado' };

  it('accepts the generic or organogram edit permission', () => {
    const permissions = Reflect.getMetadata(ANY_PERMISSIONS_KEY, LegendariosController.prototype.update);

    expect(permissions).toEqual(['legendarios.update', 'organogram.person.edit']);
  });

  it('validates access scope before updating a legendary', async () => {
    const service = {
      findOne: jest.fn().mockResolvedValue({ id: 'legendary-1' }),
      update: jest.fn().mockResolvedValue({ id: 'legendary-1', ...dto }),
    };
    const controller = new LegendariosController(service as unknown as LegendariosService);

    await expect(controller.update('legendary-1', dto, user)).resolves.toEqual({
      data: { id: 'legendary-1', ...dto },
    });
    expect(service.findOne).toHaveBeenCalledWith('legendary-1', user);
    expect(service.update).toHaveBeenCalledWith('legendary-1', dto, user.sub);
  });

  it('does not update a legendary outside the user scope', async () => {
    const service = {
      findOne: jest.fn().mockRejectedValue(new NotFoundException()),
      update: jest.fn(),
    };
    const controller = new LegendariosController(service as unknown as LegendariosService);

    await expect(controller.update('legendary-1', dto, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.update).not.toHaveBeenCalled();
  });
});

describe('LegendariosController — GET /legendarios/options', () => {
  /** Roda o guard REAL sobre o decorator REAL do handler (não uma lista alimentada à mão). */
  function canActivateOptions(effectiveKeys: string[]) {
    const effective = {
      resolveKeys: jest.fn().mockResolvedValue(effectiveKeys),
    } as unknown as EffectivePermissionsService;
    const guard = new PermissionsGuard(new Reflector(), effective);
    const context = {
      getHandler: () => LegendariosController.prototype.options,
      getClass: () => LegendariosController,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1' } }) }),
    } as any;
    return guard.canActivate(context);
  }

  it('exige QUALQUER UMA das permissions de opções, não todas', () => {
    const anyOf = Reflect.getMetadata(ANY_PERMISSIONS_KEY, LegendariosController.prototype.options);
    const allOf = Reflect.getMetadata(PERMISSIONS_KEY, LegendariosController.prototype.options);

    expect(anyOf).toEqual([...LEGENDARY_OPTIONS_PERMISSIONS]);
    // Se `@Permissions` sobrevivesse junto, o guard faria AND com o OR e o efeito
    // seria continuar exigindo `legendarios.read` — a regressão que esta change corrige.
    expect(allOf).toBeUndefined();
  });

  it('mantém o acesso de quem tem a leitura da tela global', async () => {
    await expect(canActivateOptions(['legendarios.read'])).resolves.toBe(true);
  });

  it.each(LEGENDARY_OPTIONS_PERMISSIONS.map((permission) => [permission]))(
    'libera a busca para quem só tem %s (formulário de dirigente)',
    async (permission) => {
      await expect(canActivateOptions([permission])).resolves.toBe(true);
    },
  );

  it('nega quem não tem nenhuma das permissions de opções', async () => {
    await expect(canActivateOptions(['dashboard.read', 'map.read', 'tops.read'])).resolves.toBe(false);
  });

  it('não vaza o detalhe: GET /legendarios/:id segue no seu próprio anyOf', () => {
    const anyOf = Reflect.getMetadata(ANY_PERMISSIONS_KEY, LegendariosController.prototype.findOne);

    expect(anyOf).toEqual(['legendarios.read', 'teams.members.read']);
  });
});
