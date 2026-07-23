import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ChurchesController } from './churches.controller';
import { ChurchQueryDto } from './dto/church-query.dto';
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
      search: jest.fn().mockResolvedValue({ data: [{ id: 'c1' }], meta: { total: 1 } }),
      searchCities: jest.fn().mockResolvedValue(['Goiânia']),
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

  it('spiritual-leaders exige a permission dedicada; os demais endpoints ficam em churches.read', () => {
    const reflector = new Reflector();
    // change alinhar-abas: a view de Líderes tem permission própria, independente de Igrejas.
    expect(reflector.get(PERMISSIONS_KEY, controller.spiritualLeaders)).toEqual(['spiritual-leaders.read']);
    expect(reflector.get(PERMISSIONS_KEY, controller.findAll)).toEqual(['churches.read']);
    expect(reflector.get(PERMISSIONS_KEY, controller.findOne)).toEqual(['churches.read']);
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

  it('GET /churches/search repassa DTO e usuário sem alterar a resposta paginada', async () => {
    const query = { page: 2, perPage: 10, search: 'batista' } as ChurchQueryDto;

    const result = await controller.search(user, query);

    expect(service.search).toHaveBeenCalledWith(query, user);
    expect(result).toEqual({ data: [{ id: 'c1' }], meta: { total: 1 } });
  });

  it('GET /churches/search/cities retorna as cidades do escopo', async () => {
    await expect(controller.searchCities(user)).resolves.toEqual({ data: ['Goiânia'] });
    expect(service.searchCities).toHaveBeenCalledWith(user);
  });

  it('os endpoints dedicados exigem churches.read', () => {
    const reflector = new Reflector();
    expect(reflector.get(PERMISSIONS_KEY, controller.search)).toEqual(['churches.read']);
    expect(reflector.get(PERMISSIONS_KEY, controller.searchCities)).toEqual(['churches.read']);
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

  describe('ChurchQueryDto', () => {
    it('transforma filtros booleanos e paginação vindos da query string', async () => {
      const dto = plainToInstance(ChurchQueryDto, {
        page: '2',
        perPage: '15',
        hasCoordinates: 'false',
        hasLegendarios: 'true',
      });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto).toEqual(expect.objectContaining({
        page: 2,
        perPage: 15,
        hasCoordinates: false,
        hasLegendarios: true,
      }));
    });

    it('rejeita booleano e ordenação inválidos', async () => {
      const dto = plainToInstance(ChurchQueryDto, {
        hasCoordinates: 'talvez',
        orderBy: 'city',
      });

      expect(await validate(dto)).toHaveLength(2);
    });
  });
});
