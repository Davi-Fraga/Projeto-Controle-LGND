import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PreRegistrationsService } from './preregistrations.service';

const ACTOR = 'actor-id';

describe('PreRegistrationsService', () => {
  let service: PreRegistrationsService;
  let prisma: any;
  let audit: any;
  let legendarios: any;
  let tops: any;

  beforeEach(() => {
    prisma = {
      // $transaction roda o callback com o próprio mock como cliente da transação (tx).
      $transaction: jest.fn((cb: any) => cb(prisma)),
      topEvent: { findFirst: jest.fn(), findMany: jest.fn() },
      topPreRegistration: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      legendary: { findFirst: jest.fn(), findUnique: jest.fn() },
      church: { findMany: jest.fn() },
      topParticipant: { findFirst: jest.fn() },
    };
    audit = { create: jest.fn() };
    legendarios = { create: jest.fn() };
    tops = { addParticipant: jest.fn() };
    service = new PreRegistrationsService(prisma, audit, legendarios, tops);
  });

  // ---------------------------------------------------------------- webhook
  describe('ingestFromWebhook', () => {
    it('throws NotFound when TOP does not exist', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce(null);
      await expect(service.ingestFromWebhook('top-1', { fullName: 'Joao' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when TOP is not open (e.g. COMPLETED)', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', status: 'COMPLETED' });
      await expect(service.ingestFromWebhook('top-1', { fullName: 'Joao' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when fullName is missing', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', status: 'REGISTRATION_OPEN' });
      await expect(service.ingestFromWebhook('top-1', { email: 'x@y.com' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not duplicate a PENDING with the same email/TOP', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', status: 'PLANNED' });
      const existing = { id: 'pre-existing', status: 'PENDING' };
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce(existing);

      const result = await service.ingestFromWebhook('top-1', { fullName: 'Joao', email: 'j@x.com' });

      expect(result).toBe(existing);
      expect(prisma.topPreRegistration.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING pre-registration, trims fields, stores rawPayload and audits', async () => {
      prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', status: 'REGISTRATION_OPEN' });
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce(null);
      const payload = { fullName: '  Joao  ', email: ' j@x.com ', phone: '6199', city: ' Bsb ', churchName: ' Igreja X ', extra: 'forms-field' };
      prisma.topPreRegistration.create.mockResolvedValueOnce({ id: 'pre-1' });

      await service.ingestFromWebhook('top-1', payload);

      const data = prisma.topPreRegistration.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ topEventId: 'top-1', fullName: 'Joao', email: 'j@x.com', phone: '6199', city: 'Bsb', churchName: 'Igreja X', status: 'PENDING' });
      expect(data.rawPayload).toBe(payload); // objeto inteiro preservado (inclui campos extras)
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'TopPreRegistration', action: 'webhook_ingest' }));
    });
  });

  // ---------------------------------------------------------------- approve
  describe('approve', () => {
    it('throws NotFound when pre-registration belongs to another TOP', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'other-top', status: 'PENDING' });
      await expect(service.approve('top-1', 'pre-1', {}, ACTOR)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is idempotent when already APPROVED (no new legendary/participant)', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValue({ id: 'pre-1', topEventId: 'top-1', status: 'APPROVED', legendaryId: null });

      await service.approve('top-1', 'pre-1', {}, ACTOR);

      expect(legendarios.create).not.toHaveBeenCalled();
      expect(tops.addParticipant).not.toHaveBeenCalled();
      expect(prisma.topPreRegistration.update).not.toHaveBeenCalled();
    });

    it('throws BadRequest when already REJECTED', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'REJECTED' });
      await expect(service.approve('top-1', 'pre-1', {}, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('links an existing legendary (no creation) and enrolls as participant', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', notes: null });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'leg-existing' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1', status: 'APPROVED', legendaryId: 'leg-existing' });

      await service.approve('top-1', 'pre-1', { legendaryId: 'leg-existing' }, ACTOR);

      expect(legendarios.create).not.toHaveBeenCalled();
      expect(tops.addParticipant).toHaveBeenCalledWith('top-1', expect.objectContaining({ legendaryId: 'leg-existing', type: 'NEW_PARTICIPANT', status: 'REGISTERED' }), ACTOR, expect.anything());
      expect(prisma.topPreRegistration.update.mock.calls[0][0].data).toMatchObject({ status: 'APPROVED', legendaryId: 'leg-existing', reviewedByUserId: ACTOR });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'approve' }), expect.anything());
    });

    it('throws BadRequest when provided legendaryId does not exist', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING' });
      prisma.legendary.findFirst.mockResolvedValueOnce(null);
      await expect(service.approve('top-1', 'pre-1', { legendaryId: 'ghost' }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates legendary resolving church by name (case/accent-insensitive) and passes churchId', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', fullName: 'Joao', phone: null, city: null, email: 'j@x.com', churchName: '  IGREJA  alpha ', notes: null });
      prisma.church.findMany.mockResolvedValueOnce([{ id: 'church-1', name: 'Igreja Alpha' }]);
      legendarios.create.mockResolvedValueOnce({ id: 'leg-new' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1', status: 'APPROVED', legendaryId: 'leg-new' });

      await service.approve('top-1', 'pre-1', {}, ACTOR);

      const createdDto = legendarios.create.mock.calls[0][0];
      expect(createdDto).toMatchObject({ fullName: 'Joao', churchId: 'church-1', needsReview: true });
      expect(tops.addParticipant).toHaveBeenCalledWith('top-1', expect.objectContaining({ legendaryId: 'leg-new' }), ACTOR, expect.anything());
    });

    it('leaves churchId undefined and keeps churchName in notes when no church matches', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', fullName: 'Joao', phone: null, city: null, email: null, churchName: 'Igreja Inexistente', notes: null });
      prisma.church.findMany.mockResolvedValueOnce([{ id: 'church-1', name: 'Outra Igreja' }]);
      legendarios.create.mockResolvedValueOnce({ id: 'leg-new' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1' });

      await service.approve('top-1', 'pre-1', {}, ACTOR);

      const createdDto = legendarios.create.mock.calls[0][0];
      expect(createdDto.churchId).toBeUndefined();
      expect(createdDto.notes).toContain('Igreja Inexistente');
    });

    it('does not duplicate participant when legendary is already an active participant', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', notes: null });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'leg-1' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'part-existing' }); // já participa
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1', status: 'APPROVED' });

      await service.approve('top-1', 'pre-1', { legendaryId: 'leg-1' }, ACTOR);

      expect(tops.addParticipant).not.toHaveBeenCalled();
    });

    it('wraps Legendary + participant + update in a single transaction', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', notes: null });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'leg-1' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1', status: 'APPROVED' });

      await service.approve('top-1', 'pre-1', { legendaryId: 'leg-1' }, ACTOR);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rolls back (does not update the pre-registration) when enrolling the participant fails', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', notes: null });
      prisma.legendary.findFirst.mockResolvedValueOnce({ id: 'leg-1' });
      prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
      tops.addParticipant.mockRejectedValueOnce(new Error('TOP gone'));

      await expect(service.approve('top-1', 'pre-1', { legendaryId: 'leg-1' }, ACTOR)).rejects.toThrow('TOP gone');
      expect(prisma.topPreRegistration.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- reject
  describe('reject', () => {
    it('throws NotFound when pre-registration belongs to another TOP', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'other', status: 'PENDING' });
      await expect(service.reject('top-1', 'pre-1', {}, ACTOR)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets REJECTED with reviewer and audits', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'PENDING', notes: null });
      prisma.topPreRegistration.update.mockResolvedValueOnce({ id: 'pre-1', status: 'REJECTED' });

      await service.reject('top-1', 'pre-1', { notes: 'fora do perfil' }, ACTOR);

      expect(prisma.topPreRegistration.update.mock.calls[0][0].data).toMatchObject({ status: 'REJECTED', reviewedByUserId: ACTOR, notes: 'fora do perfil' });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'reject' }));
    });

    it('is idempotent when already REJECTED', async () => {
      prisma.topPreRegistration.findFirst.mockResolvedValueOnce({ id: 'pre-1', topEventId: 'top-1', status: 'REJECTED' });

      await service.reject('top-1', 'pre-1', {}, ACTOR);

      expect(prisma.topPreRegistration.update).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------ pending count
  describe('pendingCountByTopEvent', () => {
    it('groups PENDING counts and enriches with the TOP event', async () => {
      prisma.topPreRegistration.groupBy.mockResolvedValueOnce([{ topEventId: 't1', _count: { _all: 3 } }]);
      prisma.topEvent.findMany.mockResolvedValueOnce([{ id: 't1', name: 'TOP A', number: 5 }]);

      const result = await service.pendingCountByTopEvent();

      expect(result).toEqual([{ topEventId: 't1', topEvent: { id: 't1', name: 'TOP A', number: 5 }, count: 3 }]);
      const where = prisma.topPreRegistration.groupBy.mock.calls[0][0].where;
      expect(where).toMatchObject({ status: 'PENDING', deletedAt: null });
    });
  });
});
