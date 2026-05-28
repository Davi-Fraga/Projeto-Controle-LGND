import { BadRequestException } from '@nestjs/common';
import {
  TopEventStatus,
  TopParticipantStatus,
  TopParticipantType,
  TopServantStatus,
} from '@central-da-manada/shared';
import { TopsService } from './tops.service';

describe('TopsService', () => {
  let service: TopsService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      topEvent: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      legendary: { findFirst: jest.fn() },
      team: { findFirst: jest.fn() },
      topTeam: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      topParticipant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      topServant: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    audit = { create: jest.fn() };
    service = new TopsService(prisma, audit);
  });

  it('creates TOP', async () => {
    prisma.topEvent.findFirst.mockResolvedValueOnce(null);
    prisma.topEvent.create.mockResolvedValueOnce({ id: 'top-1', name: 'TOP 1', number: 1, _count: { participants: 0, servants: 0, teams: 0 } });
    const result = await service.create({ name: 'TOP 1', number: 1, city: 'Brasilia', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-03'), status: TopEventStatus.PLANNED });
    expect(result.id).toBe('top-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
  });

  it('blocks invalid date range', async () => {
    await expect(service.create({ name: 'TOP', number: 1, city: 'Brasilia', startDate: new Date('2026-06-03'), endDate: new Date('2026-06-01'), status: TopEventStatus.PLANNED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks duplicated leadership people', async () => {
    prisma.topEvent.findFirst.mockResolvedValueOnce({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    await expect(service.update('top-1', { representativeLegendaryId: 'l1', deputyRepresentativeLegendaryId: 'l1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('links team to TOP and blocks duplicate', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1' });
    prisma.topTeam.findFirst.mockResolvedValueOnce(null);
    prisma.topTeam.create.mockResolvedValueOnce({ id: 'tt-1', topEventId: 'top-1', teamId: 'team-1' });
    await expect(service.addTeam('top-1', { teamId: 'team-1' })).resolves.toMatchObject({ id: 'tt-1' });
    prisma.team.findFirst.mockResolvedValueOnce({ id: 'team-1' });
    prisma.topTeam.findFirst.mockResolvedValueOnce({ id: 'tt-1' });
    await expect(service.addTeam('top-1', { teamId: 'team-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds participant and blocks duplicate', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.legendary.findFirst.mockResolvedValue({ id: 'l1' });
    prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.create.mockResolvedValueOnce({ id: 'p1', legendaryId: 'l1' });
    await expect(service.addParticipant('top-1', { legendaryId: 'l1', type: TopParticipantType.LEGENDARY, status: TopParticipantStatus.REGISTERED })).resolves.toMatchObject({ id: 'p1' });
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1' });
    await expect(service.addParticipant('top-1', { legendaryId: 'l1', type: TopParticipantType.LEGENDARY, status: TopParticipantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds servant, validates team link and blocks participant conflict', async () => {
    prisma.topEvent.findFirst.mockResolvedValue({ id: 'top-1', _count: { participants: 0, servants: 0, teams: 0 } });
    prisma.legendary.findFirst.mockResolvedValue({ id: 'l1' });
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.findFirst.mockResolvedValueOnce(null);
    prisma.topTeam.findFirst.mockResolvedValueOnce(null);
    await expect(service.addServant('top-1', { legendaryId: 'l1', teamId: 'team-1', status: TopServantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
    prisma.topServant.findFirst.mockResolvedValueOnce(null);
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1' });
    await expect(service.addServant('top-1', { legendaryId: 'l1', status: TopServantStatus.REGISTERED })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels participant and servant', async () => {
    prisma.topParticipant.findFirst.mockResolvedValueOnce({ id: 'p1', topEventId: 'top-1' });
    prisma.topParticipant.update.mockResolvedValueOnce({ id: 'p1', status: TopParticipantStatus.CANCELLED });
    await expect(service.cancelParticipant('top-1', 'p1')).resolves.toMatchObject({ status: TopParticipantStatus.CANCELLED });
    prisma.topServant.findFirst.mockResolvedValueOnce({ id: 's1', topEventId: 'top-1' });
    prisma.topServant.update.mockResolvedValueOnce({ id: 's1', status: TopServantStatus.CANCELLED });
    await expect(service.cancelServant('top-1', 's1')).resolves.toMatchObject({ status: TopServantStatus.CANCELLED });
  });
});
