import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ChurchesController } from './churches.controller';
import { ListChurchesQueryDto } from './dto/list-churches-query.dto';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';

describe('ChurchesController (listagens com busca)', () => {
  let controller: ChurchesController;
  let service: any;
  const user = { sub: 'u1', roles: [], permissions: [] } as any;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      spiritualLeadersView: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn().mockResolvedValue({ id: 'c1' }),
    };
    controller = new ChurchesController(service);
  });

  it('GET /churches repassa usuário e search ao service e embrulha em { data }', async () => {
    const result = await controller.findAll(user, { search: 'sao jose' } as ListChurchesQueryDto);

    expect(service.findAll).toHaveBeenCalledWith(user, 'sao jose');
    expect(result).toEqual({ data: [{ id: 'c1' }] });
  });

  it('GET /churches sem termo repassa search undefined (formato preservado)', async () => {
    await controller.findAll(user, {} as ListChurchesQueryDto);
    expect(service.findAll).toHaveBeenCalledWith(user, undefined);
  });

  it('GET /churches/spiritual-leaders repassa usuário e search ao service', async () => {
    await controller.spiritualLeaders(user, { search: 'amilton' } as ListChurchesQueryDto);
    expect(service.spiritualLeadersView).toHaveBeenCalledWith(user, 'amilton');
  });

  it('ambos os endpoints exigem a permission churches.read', () => {
    const reflector = new Reflector();
    expect(reflector.get(PERMISSIONS_KEY, controller.findAll)).toEqual(['churches.read']);
    expect(reflector.get(PERMISSIONS_KEY, controller.spiritualLeaders)).toEqual(['churches.read']);
  });

  it('POST e PATCH repassam o usuário autenticado completo ao service', async () => {
    const createDto = { name: 'Igreja' } as CreateChurchDto;
    const updateDto = { spiritualLeaderLegendaryId: null } as UpdateChurchDto;

    await controller.create(createDto, user);
    await controller.update('c1', updateDto, user);

    expect(service.create).toHaveBeenCalledWith(createDto, user);
    expect(service.update).toHaveBeenCalledWith('c1', updateDto, user);
  });

  describe('DTO do vínculo com Legendário', () => {
    const validId = '11111111-1111-4111-8111-111111111111';

    it('aceita UUID na criação e null na atualização', async () => {
      const createDto = plainToInstance(CreateChurchDto, { name: 'Igreja', spiritualLeaderLegendaryId: validId });
      const updateDto = plainToInstance(UpdateChurchDto, { spiritualLeaderLegendaryId: null });

      expect(await validate(createDto)).toHaveLength(0);
      expect(await validate(updateDto)).toHaveLength(0);
    });

    it('rejeita identificador inválido', async () => {
      const dto = plainToInstance(UpdateChurchDto, { spiritualLeaderLegendaryId: 'invalido' });
      expect(await validate(dto)).not.toHaveLength(0);
    });
  });

  describe('ListChurchesQueryDto', () => {
    it('aceita search string opcional', async () => {
      const dto = plainToInstance(ListChurchesQueryDto, { search: 'texto' });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('aceita ausência de search', async () => {
      const dto = plainToInstance(ListChurchesQueryDto, {});
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejeita search não-string', async () => {
      const dto = plainToInstance(ListChurchesQueryDto, { search: 123 });
      expect(await validate(dto)).not.toHaveLength(0);
    });
  });
});
