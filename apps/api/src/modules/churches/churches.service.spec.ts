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
    };
    audit = { create: jest.fn() };
    accessPolicy = { resolveScope: jest.fn(), buildChurchWhere: jest.fn() };
    geocoding = { geocode: jest.fn() };
    service = new ChurchesService(prisma, audit, accessPolicy, geocoding as any);
  });

  describe('create', () => {
    it('geocodifica quando não recebe coordenadas', async () => {
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.68, lng: -49.26, displayName: 'Goiânia' });

      await service.create({ name: 'Igreja Central', city: 'Goiânia' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Igreja Central', 'Goiânia');
      expect(prisma.church.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
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

  describe('update', () => {
    const before = { id: 'church-1', name: 'Antiga', city: 'Goiânia', latitude: -10, longitude: -20, spiritualLeaderUserId: null };

    it('geocodifica quando name ou city muda e não há coordenadas manuais', async () => {
      prisma.church.findFirst.mockResolvedValueOnce(before);
      geocoding.geocode.mockResolvedValueOnce({ lat: -16.68, lng: -49.26, displayName: 'Anápolis' });

      await service.update('church-1', { city: 'Anápolis' } as any, 'actor');

      expect(geocoding.geocode).toHaveBeenCalledWith('Antiga', 'Anápolis');
      expect(prisma.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ latitude: -16.68, longitude: -49.26 }) }),
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
});
