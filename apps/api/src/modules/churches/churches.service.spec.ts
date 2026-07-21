import { ChurchesService } from './churches.service';

describe('ChurchesService geocoding integration', () => {
  let service: ChurchesService;
  let prisma: any;
  let audit: any;
  let accessPolicy: any;
  let geocoding: { geocode: jest.Mock };

  beforeEach(() => {
    prisma = {
      church: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'church-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'church-1', ...data })),
      },
      user: { findFirst: jest.fn() },
      legendary: { count: jest.fn() },
    };
    audit = { create: jest.fn() };
    accessPolicy = { resolveScope: jest.fn(), buildChurchWhere: jest.fn() };
    geocoding = { geocode: jest.fn() };
    service = new ChurchesService(prisma, audit, accessPolicy, geocoding as any);
  });

  describe('create', () => {
    it('normaliza o telefone do líder antes de persistir', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: 'Igreja Central', spiritualLeaderPhone: '5564992485187' } as any, 'actor');

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: '(64) 99248-5187' }) }),
      );
    });

    it('geocodifica quando não recebe coordenadas', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.68, lng: -49.26, displayName: 'Goiânia' });

      await service.create({ name: 'Igreja Central', city: 'Goiânia' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja Central', 'Goiânia', null);
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
      );
    });

    it('usa endereço como locationHint no geocoding e o persiste', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.7, lng: -49.3, displayName: 'Rua X' });

      await service.create({ name: 'Igreja Central', city: 'Goiânia', address: 'Rua X, 100' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja Central', 'Goiânia', 'Rua X, 100');
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ address: 'Rua X, 100', latitude: -16.7, longitude: -49.3 }) }),
      );
    });

    it('preserva coordenadas manuais e não chama o geocoding', async () => {
      await service.create({ name: 'Igreja Central', city: 'Goiânia', latitude: -1.1, longitude: -2.2 } as any, 'actor');

      expect(geocoding.geocode).not.toHaveBeenCalled();
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -1.1, longitude: -2.2 }) }),
      );
    });

    it('cria sem coordenadas quando o geocoding retorna null', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: 'Igreja Central', city: 'Lugar Nenhum' } as any, 'actor');

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: null, longitude: null }) }),
      );
    });
  });

  describe('phone normalization', () => {
    it('normaliza o telefone do líder na edição e preserva null explícito', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Igreja', city: 'Goiânia', address: null, spiritualLeaderUserId: null });

      await service.update('church-1', { spiritualLeaderPhone: '+55 64 99988-7766' } as any, 'actor');

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: '(64) 99988-7766' }) }),
      );

      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Igreja', city: 'Goiânia', address: null, spiritualLeaderUserId: null });
      await service.update('church-1', { spiritualLeaderPhone: null } as any, 'actor');
      expect(prisma.church.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ spiritualLeaderPhone: null }) }),
      );
    });
  });

  describe('normalizedName', () => {
    it('persiste normalizedName sem acento, minúsculo e com espaços colapsados ao criar', async () => {
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.create({ name: '  São   José ' } as any, 'actor');

      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'São   José', normalizedName: 'sao jose' }) }),
      );
    });

    it('recalcula normalizedName quando o nome muda na edição', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Antiga', city: 'Goiânia', spiritualLeaderUserId: null });
      geocoding.geocode.mockResolvedValueOnce(null);

      await service.update('church-1', { name: 'Ígreja Nôva' } as any, 'actor');

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Ígreja Nôva', normalizedName: 'igreja nova' }) }),
      );
    });

    it('não altera normalizedName quando o nome não é enviado na edição', async () => {
      prisma.church.findFirst.mockResolvedValueOnce({ id: 'church-1', name: 'Antiga', city: 'Goiânia', spiritualLeaderUserId: null });

      await service.update('church-1', { notes: 'nota' } as any, 'actor');

      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ normalizedName: undefined }) }),
      );
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

      await service.update('church-1', { city: 'Anápolis' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Antiga', 'Anápolis', null);
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
      );
    });

    it('geocodifica ao mudar endereço, mesmo sem mudar nome/cidade', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.7, lng: -49.3, displayName: 'Rua Y' });

      await service.update('church-1', { address: 'Rua Y, 200' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Antiga', 'Goiânia', 'Rua Y, 200');
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ address: 'Rua Y, 200', latitude: -16.7, longitude: -49.3 }) }),
      );
    });

    it('não geocodifica quando nome e cidade permanecem iguais', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);

      await service.update('church-1', { notes: 'só uma nota' } as any, 'actor');

      expect(geocoding.geocode).not.toHaveBeenCalled();
    });

    it('preserva coordenadas manuais mesmo mudando nome ou cidade', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);

      await service.update('church-1', { city: 'Anápolis', latitude: -5.5, longitude: -6.6 } as any, 'actor');

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
