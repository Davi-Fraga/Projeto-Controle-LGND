import { BadRequestException } from '@nestjs/common';
import { LegendaryStatus } from '@central-da-manada/shared';
import { LegendariosService } from './legendarios.service';

describe('LegendariosService', () => {
  let service: LegendariosService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      legendary: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      church: { findFirst: jest.fn() },
      profession: { findFirst: jest.fn() },
      expertise: { count: jest.fn() },
    };
    audit = { create: jest.fn() };
    service = new LegendariosService(prisma, audit);
  });

  it('lists legendarios with pagination', async () => {
    prisma.legendary.findMany.mockResolvedValueOnce([
      { id: '1', fullName: 'Joao', expertises: [] },
    ]);
    prisma.legendary.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, perPage: 10 });

    expect(result.meta.total).toBe(1);
    expect(result.data[0].fullName).toBe('Joao');
  });

  it('creates a legendario', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce(null);
    prisma.legendary.create.mockResolvedValueOnce({
      id: '1',
      fullName: 'Joao Silva',
      phone: '61999999999',
      expertises: [],
    });

    const result = await service.create({
      fullName: 'Joao Silva',
      phone: '(61) 99999-9999',
      isFromRotaDoCerrado: true,
      servesInChurch: false,
      status: LegendaryStatus.ACTIVE,
      socialActionInterest: true,
      expertiseIds: [],
    });

    expect(prisma.legendary.create).toHaveBeenCalled();
    expect(result.phone).toBe('61999999999');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('blocks duplicated LGND number', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({ id: 'existing', lgndNumber: '123' });

    await expect(
      service.create({
        fullName: 'Joao Silva',
        lgndNumber: '123',
        isFromRotaDoCerrado: true,
        servesInChurch: false,
        status: LegendaryStatus.ACTIVE,
        socialActionInterest: false,
        expertiseIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a legendario and replaces expertises', async () => {
    prisma.legendary.findFirst.mockResolvedValueOnce({ id: '1', fullName: 'Antes', expertises: [] });
    prisma.legendary.findUnique.mockResolvedValueOnce(null);
    prisma.expertise.count.mockResolvedValueOnce(1);
    prisma.$transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        legendaryExpertise: { deleteMany: jest.fn() },
        legendary: {
          update: jest.fn().mockResolvedValue({
            id: '1',
            fullName: 'Depois',
            expertises: [{ expertise: { id: 'exp-1', name: 'Logistica' } }],
          }),
        },
      }),
    );

    const result = await service.update('1', {
      fullName: 'Depois',
      expertiseIds: ['exp-1'],
    });

    expect(result.fullName).toBe('Depois');
    expect(result.expertises).toHaveLength(1);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }));
  });

  it('soft deletes and marks as inactive', async () => {
    prisma.legendary.findUnique.mockResolvedValueOnce({ id: '1', fullName: 'Joao', expertises: [] });
    prisma.legendary.update.mockResolvedValueOnce({
      id: '1',
      fullName: 'Joao',
      status: LegendaryStatus.INACTIVE,
      deletedAt: new Date(),
      expertises: [],
    });

    const result = await service.deactivate('1');

    expect(result.status).toBe(LegendaryStatus.INACTIVE);
    expect(prisma.legendary.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: LegendaryStatus.INACTIVE }),
      }),
    );
  });
});
