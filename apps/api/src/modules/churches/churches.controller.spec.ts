import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ChurchesController } from './churches.controller';
import { ListChurchesQueryDto } from './dto/list-churches-query.dto';

describe('ChurchesController (listagens com busca)', () => {
  let controller: ChurchesController;
  let service: any;
  const user = { sub: 'u1', roles: [], permissions: [] } as any;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      spiritualLeadersView: jest.fn().mockResolvedValue([{ id: 'c1' }]),
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
