import { ChurchesService } from './churches.service';

describe('ChurchesService geocoding integration', () => {
  let service: ChurchesService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;
  let geocoding: { geocode: jest.Mock };
  const actor = { sub: 'actor', roles: [], permissions: [] } as any;

  beforeEach(() => {
    prisma = {
      church: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'church-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'church-1', ...data })),
      },
      user: { findFirst: jest.fn() },
      legendary: { count: jest.fn(), findFirst: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn(),
      buildChurchWhere: jest.fn(),
      buildChurchScopeWhere: jest.fn(),
      buildLegendaryWhere: jest.fn(),
    };
    geocoding = { geocode: jest.fn() };
    service = new ChurchesService(prisma, audit, accessPolicy, geocoding as any);
  });

  describe('create', () => {
    it('normaliza o telefone do líder antes de persistir', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: 'Igreja Central', spiritualLeaderPhone: '5564992485187' } as any, actor);

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: '(64) 99248-5187' }) }),
      );
    });

    it('geocodifica quando não recebe coordenadas', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.68, lng: -49.26, displayName: 'Goiânia' });

      await service.create({ name: 'Igreja Central', city: 'Goiânia' } as any, actor);

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja Central', 'Goiânia', null);
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
      );
    });

    it('usa endereço como locationHint no geocoding e o persiste', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.7, lng: -49.3, displayName: 'Rua X' });

      await service.create({ name: 'Igreja Central', city: 'Goiânia', address: 'Rua X, 100' } as any, actor);

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja Central', 'Goiânia', 'Rua X, 100');
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ address: 'Rua X, 100', latitude: -16.7, longitude: -49.3 }) }),
      );
    });

    it('preserva coordenadas manuais e não chama o geocoding', async () => {
      await service.create({ name: 'Igreja Central', city: 'Goiânia', latitude: -1.1, longitude: -2.2 } as any, actor);

      expect(geocoding.geocode).not.toHaveBeenCalled();
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -1.1, longitude: -2.2 }) }),
      );
    });

    it('cria sem coordenadas quando o geocoding retorna null', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: 'Igreja Central', city: 'Lugar Nenhum' } as any, actor);

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: null, longitude: null }) }),
      );
    });
  });

  describe('phone normalization', () => {
    it('normaliza o telefone do líder na edição e preserva null explícito', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Igreja', city: 'Goiânia', address: null, spiritualLeaderUserId: null });

      await service.update('church-1', { spiritualLeaderPhone: '+55 64 99988-7766' } as any, actor);

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: '(64) 99988-7766' }) }),
      );

      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Igreja', city: 'Goiânia', address: null, spiritualLeaderUserId: null });
      await service.update('church-1', { spiritualLeaderPhone: null } as any, actor);
      expect(prisma.church.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: null }) }),
      );
    });
  });

  describe('normalizedName', () => {
    it('persiste normalizedName sem acento, minúsculo e com espaços colapsados ao criar', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: '  São   José ' } as any, actor);

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'São   José', normalizedName: 'sao jose' }) }),
      );
    });

    it('recalcula normalizedName quando o nome muda na edição', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Antiga', city: 'Goiânia', spiritualLeaderUserId: null });
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.update('church-1', { name: 'Ígreja Nôva' } as any, actor);

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Ígreja Nôva', normalizedName: 'igreja nova' }) }),
      );
    });

    it('não altera normalizedName quando o nome não é enviado na edição', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Antiga', city: 'Goiânia', spiritualLeaderUserId: null });

      await service.update('church-1', { notes: 'nota' } as any, actor);

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ normalizedName: undefined }) }),
      );
    });
  });

  describe('searchText', () => {
    it('persiste nome + cidade normalizados ao criar', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: ' Primeira Igreja ', city: ' São José ' } as any, actor);

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ searchText: 'primeira igreja sao jose' }),
        }),
      );
    });

    it('recalcula com os valores mesclados quando nome ou cidade muda', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({
        id: 'church-1',
        name: 'Igreja Antiga',
        city: 'Goiânia',
        address: null,
        spiritualLeaderUserId: null,
      });
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.update('church-1', { city: 'Anápolis' } as any, actor);

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ searchText: 'igreja antiga anapolis' }),
        }),
      );
    });
  });

  describe('search (listagem paginada)', () => {
    const lastFindMany = () => prisma.church.findMany.mock.calls.at(-1)[0];

    it('busca por searchText e alias com termo normalizado antes de paginar', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
      prisma.church.findMany.mockResolvedValueOnce([{ id: 'c1' }]);
      prisma.church.count.mockResolvedValueOnce(1);

      const result = await service.search(
        { page: 1, perPage: 10, search: ' SÃO   JOÃO ' } as any,
        {} as any,
      );

      expect(lastFindMany()).toEqual(expect.objectContaining({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { searchText: { contains: 'sao joao' } },
                { aliases: { some: { normalizedAlias: { contains: 'sao joao' } } } },
              ],
            },
          ],
        },
        skip: 0,
        take: 10,
      }));
      expect(prisma.church.count).toHaveBeenCalledWith({ where: lastFindMany().where });
      expect(result).toEqual({
        data: [{ id: 'c1' }],
        meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
      });
    });

    it('não cria contains vazio quando a busca contém apenas espaços', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.search({ page: 1, perPage: 10, search: '   ' } as any, {} as any);

      expect(lastFindMany().where).toEqual({ AND: [{ deletedAt: null }] });
      expect(JSON.stringify(lastFindMany().where)).not.toContain('contains');
    });

    it('combina busca, filtros, escopo e paginação sem ampliar a visibilidade', async () => {
      const scopeWhere = {
        OR: [
          { city: { in: ['Goiânia'] } },
          { id: { in: ['church-1'] } },
        ],
      };
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      accessPolicy.buildChurchScopeWhere.mockReturnValue(scopeWhere);

      await service.search({
        page: 2,
        perPage: 5,
        search: 'batista',
        city: 'Goiânia',
        hasCoordinates: false,
        hasLegendarios: true,
        orderBy: 'name',
        orderDirection: 'asc',
      } as any, {} as any);

      expect(lastFindMany()).toEqual(expect.objectContaining({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { searchText: { contains: 'batista' } },
                { aliases: { some: { normalizedAlias: { contains: 'batista' } } } },
              ],
            },
            { city: 'Goiânia' },
            { OR: [{ latitude: null }, { longitude: null }] },
            { legendarios: { some: { deletedAt: null } } },
            scopeWhere,
          ],
        },
        orderBy: { name: 'asc' },
        skip: 5,
        take: 5,
      }));
      expect(accessPolicy.buildChurchScopeWhere).toHaveBeenCalled();
    });

    it('filtra igrejas com coordenadas e sem legendários ativos', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.search({
        page: 1,
        perPage: 10,
        hasCoordinates: true,
        hasLegendarios: false,
      } as any, {} as any);

      expect(lastFindMany().where.AND).toEqual([
        { deletedAt: null },
        { latitude: { not: null }, longitude: { not: null } },
        { legendarios: { none: { deletedAt: null } } },
      ]);
    });
  });

  describe('searchCities', () => {
    it('retorna cidades distintas somente dentro do escopo', async () => {
      const scopeWhere = { OR: [{ city: { in: ['Goiânia'] } }] };
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      accessPolicy.buildChurchScopeWhere.mockReturnValue(scopeWhere);
      prisma.church.findMany.mockResolvedValueOnce([
        { city: 'Goiânia' },
        { city: null },
      ]);

      await expect(service.searchCities({} as any)).resolves.toEqual(['Goiânia']);
      expect(prisma.church.findMany).toHaveBeenCalledWith({
        where: { AND: [{ deletedAt: null }, { city: { not: null } }, scopeWhere] },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      });
    });
  });

  describe('findAll (busca escopada)', () => {
    const lastWhere = () => prisma.church.findMany.mock.calls.at(-1)[0].where;

    it('busca por nome normalizado sem acento e por alias, sem filtro de escopo para admin', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.findAll({} as any, 'São   José');

      expect(accessPolicy.buildChurchWhere).not.toHaveBeenCalled();
      expect(lastWhere().AND).toEqual([
        { deletedAt: null },
        {
          OR: [
            { normalizedName: { contains: 'sao jose' } },
            { aliases: { some: { normalizedAlias: { contains: 'sao jose' } } } },
          ],
        },
      ]);
    });

    it('combina o escopo por AND com a busca para usuário restrito', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      accessPolicy.buildChurchWhere.mockReturnValue({ id: { in: ['c1'] } });

      await service.findAll({} as any, 'central');

      expect(lastWhere().AND).toEqual([
        { deletedAt: null },
        { id: { in: ['c1'] } },
        {
          OR: [
            { normalizedName: { contains: 'central' } },
            { aliases: { some: { normalizedAlias: { contains: 'central' } } } },
          ],
        },
      ]);
    });

    it('termo só com espaços equivale a ausência de busca (só escopo/deletedAt)', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.findAll({} as any, '   ');

      expect(lastWhere().AND).toEqual([{ deletedAt: null }]);
    });
  });

  describe('spiritualLeadersView (busca escopada)', () => {
    const lastWhere = () => prisma.church.findMany.mock.calls.at(-1)[0].where;

    it('busca por igreja/alias (normalizado) e por nome do líder/legado (case-insensitive)', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });

      await service.spiritualLeadersView({} as any, 'Amilton');

      expect(lastWhere().AND).toEqual([
        { deletedAt: null },
        {
          OR: [
            { normalizedName: { contains: 'amilton' } },
            { aliases: { some: { normalizedAlias: { contains: 'amilton' } } } },
            { spiritualLeader: { name: { contains: 'Amilton', mode: 'insensitive' } } },
            { spiritualLeaderLegendary: { fullName: { contains: 'Amilton', mode: 'insensitive' }, deletedAt: null } },
            { spiritualLeaderName: { contains: 'Amilton', mode: 'insensitive' } },
          ],
        },
      ]);
    });

    it('usuário restrito sem termo recebe apenas o filtro de escopo', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: false });
      accessPolicy.buildChurchWhere.mockReturnValue({ id: { in: ['c1'] } });

      await service.spiritualLeadersView({} as any);

      expect(lastWhere().AND).toEqual([{ deletedAt: null }, { id: { in: ['c1'] } }]);
    });
  });

  describe('update', () => {
    const before = { id: 'church-1', name: 'Antiga', city: 'Goiânia', latitude: -10, longitude: -20, spiritualLeaderUserId: null };

    it('geocodifica quando name ou city muda e não há coordenadas manuais', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.68, lng: -49.26, displayName: 'Anápolis' });

      await service.update('church-1', { city: 'Anápolis' } as any, actor);

      expect(geocoding.geocode).toHaveBeenCalledWith('Antiga', 'Anápolis', null);
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
      );
    });

    it('geocodifica ao mudar endereço, mesmo sem mudar nome/cidade', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.7, lng: -49.3, displayName: 'Rua Y' });

      await service.update('church-1', { address: 'Rua Y, 200' } as any, actor);

      expect(geocoding.geocode).toHaveBeenCalledWith('Antiga', 'Goiânia', 'Rua Y, 200');
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ address: 'Rua Y, 200', latitude: -16.7, longitude: -49.3 }) }),
      );
    });

    it('não geocodifica quando nome e cidade permanecem iguais', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);

      await service.update('church-1', { notes: 'só uma nota' } as any, actor);

      expect(geocoding.geocode).not.toHaveBeenCalled();
    });

    it('preserva coordenadas manuais mesmo mudando nome ou cidade', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);

      await service.update('church-1', { city: 'Anápolis', latitude: -5.5, longitude: -6.6 } as any, actor);

      expect(geocoding.geocode).not.toHaveBeenCalled();
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -5.5, longitude: -6.6 }) }),
      );
    });
  });

  describe('geocode (preview)', () => {
    it('repassa o endereço como hint ao GeocodingService', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: 1, lng: 2, displayName: 'x' });

      await service.geocode('Igreja', 'Goiânia', 'Setor Bueno');

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja', 'Goiânia', 'Setor Bueno');
    });
  });

  describe('spiritualLeaderLegendary', () => {
    const legendaryId = '11111111-1111-4111-8111-111111111111';

    it('valida e persiste o vínculo ao criar sem apagar o nome livre', async () => {
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: legendaryId });
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({
        name: 'Igreja Central',
        spiritualLeaderName: 'Pastor legado',
        spiritualLeaderLegendaryId: legendaryId,
      } as any, actor);

      expect(prisma.legendary.findFirst).toHaveBeenCalledWith({
        where: { id: legendaryId, deletedAt: null },
        select: { id: true },
      });
      expect(prisma.church.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          spiritualLeaderName: 'Pastor legado',
          spiritualLeaderLegendaryId: legendaryId,
        }),
      }));
    });

    it('recusa vínculo inexistente ou excluído', async () => {
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });
      prisma.legendary.findFirst.mockResolvedValueOnce(null);

      await expect(service.create({ name: 'Igreja', spiritualLeaderLegendaryId: legendaryId } as any, actor))
        .rejects.toThrow('not found or unavailable');
      expect(prisma.church.create).not.toHaveBeenCalled();
    });

    it('recusa vínculo fora do escopo mesmo em chamada direta à API/service', async () => {
      const scopeFilter = { churchId: { in: ['church-allowed'] } };
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: false });
      accessPolicy.buildLegendaryWhere.mockReturnValueOnce(scopeFilter);
      prisma.legendary.findFirst.mockResolvedValueOnce(null);

      await expect(service.create({ name: 'Igreja', spiritualLeaderLegendaryId: legendaryId } as any, actor))
        .rejects.toThrow('not found or unavailable');
      expect(prisma.legendary.findFirst).toHaveBeenCalledWith({
        where: { id: legendaryId, deletedAt: null, AND: [scopeFilter] },
        select: { id: true },
      });
    });

    it('troca o vínculo, preserva o texto livre e registra auditoria antes/depois', async () => {
      const before = {
        id: 'church-1', name: 'Igreja', city: null, address: null,
        spiritualLeaderName: 'Nome livre', spiritualLeaderUserId: null,
        spiritualLeaderLegendaryId: '22222222-2222-4222-8222-222222222222',
      };
      prisma.church.findFirst.mockResolvedValueOnce(before);
      accessPolicy.resolveScope.mockResolvedValueOnce({ isAdmin: true });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: legendaryId });

      await service.update('church-1', { spiritualLeaderLegendaryId: legendaryId } as any, actor);

      expect(prisma.church.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          spiritualLeaderName: undefined,
          spiritualLeaderLegendaryId: legendaryId,
        }),
      }));
      expect(audit.create).toHaveBeenCalledWith({
        actorUserId: actor.sub,
        entityType: 'Church',
        entityId: 'church-1',
        action: 'update_spiritual_leader_legendary',
        before: { spiritualLeaderLegendaryId: before.spiritualLeaderLegendaryId },
        after: { spiritualLeaderLegendaryId: legendaryId },
      });
    });

    it('aceita null para desvincular sem validar outro Legendário', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({
        id: 'church-1', name: 'Igreja', city: null, address: null,
        spiritualLeaderUserId: null, spiritualLeaderLegendaryId: legendaryId,
      });

      await service.update('church-1', { spiritualLeaderLegendaryId: null } as any, actor);

      expect(prisma.legendary.findFirst).not.toHaveBeenCalled();
      expect(prisma.church.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ spiritualLeaderLegendaryId: null }),
      }));
    });

    it('deriva o nome efetivo do vínculo e retorna ao texto livre se o vínculo estiver excluído', async () => {
      accessPolicy.resolveScope.mockResolvedValue({ isAdmin: true });
      prisma.church.findMany.mockResolvedValueOnce([
        {
          id: 'c1', spiritualLeaderName: 'Nome livre',
          spiritualLeaderLegendary: { id: legendaryId, fullName: 'Nome cadastrado', deletedAt: null },
        },
        {
          id: 'c2', spiritualLeaderName: 'Nome alternativo',
          spiritualLeaderLegendary: { id: legendaryId, fullName: 'Excluído', deletedAt: new Date() },
        },
      ]);

      const result = await service.spiritualLeadersView(actor);

      expect(result[0]).toEqual(expect.objectContaining({
        spiritualLeaderEffectiveName: 'Nome cadastrado',
        spiritualLeaderLegendary: { id: legendaryId, fullName: 'Nome cadastrado' },
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        spiritualLeaderEffectiveName: 'Nome alternativo',
        spiritualLeaderLegendary: null,
      }));
    });
  });

  describe('findOne / remove', () => {
    it('findOne retorna a igreja com seus membros legendários', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'c1', name: 'Igreja X', legendarios: [{ id: 'l1', fullName: 'Ana' }] });

      const result = await service.findOne('c1');

      expect(result.legendarios).toHaveLength(1);
      expect(prisma.church.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1', deletedAt: null } }),
      );
    });

    it('findOne lança 404 quando a igreja não existe', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('x')).rejects.toThrow('Church not found.');
    });

    it('remove faz soft-delete quando a igreja está vazia', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'c1', name: 'Igreja X' });
      prisma.legendary.count.mockResolvedValueOnce(0);

      await service.remove('c1', 'actor');

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entityType: 'Church' }));
    });

    it('remove bloqueia (409) quando a igreja tem legendários, sem removê-los', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'c1', name: 'Igreja X' });
      prisma.legendary.count.mockResolvedValueOnce(3);

      await expect(service.remove('c1', 'actor')).rejects.toThrow('Legendários');
      expect(prisma.church.update).not.toHaveBeenCalled();
    });
  });
});
