import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ANY_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { LegendariosController } from './legendarios.controller';
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
