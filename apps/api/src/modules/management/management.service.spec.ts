import { ConflictException } from '@nestjs/common';
import { ManagementService } from './management.service';

describe('ManagementService', () => {
  let prisma: any;
  let audit: any;
  let accessPolicy: any;
  let service: ManagementService;

  beforeEach(() => {
    prisma = {
      legendary: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), count: jest.fn() },
      teamMembership: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), count: jest.fn(), findMany: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue(null) }, // por padrão, gestor não é admin
    };
    audit = { create: jest.fn() };
    accessPolicy = {
      resolveScope: jest.fn().mockResolvedValue({ isAdmin: true }),
      buildLegendaryWhere: jest.fn().mockReturnValue({}),
      assertTeamAllowed: jest.fn(),
    };
    service = new ManagementService(prisma, audit, accessPolicy);
  });

  const admin = { sub: 'u1' } as any;

  describe('assignCityLeader', () => {
    beforeEach(() => {
      prisma.legendary.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === 'L1') return Promise.resolve({ id: 'L1', city: 'Goiânia', cityLeaderId: null });
        if (where.id === 'LEAD') return Promise.resolve({ id: 'LEAD', city: 'Goiânia', cityLeaderId: null });
        if (where.id === 'OUTRA') return Promise.resolve({ id: 'OUTRA', city: 'Anápolis', cityLeaderId: null });
        return Promise.resolve(null);
      });
      prisma.legendary.findUnique.mockResolvedValue({ cityLeaderId: null });
    });

    it('atribui líder quando abaixo do teto', async () => {
      prisma.legendary.count.mockResolvedValue(5);
      await service.assignCityLeader({ legendaryId: 'L1', leaderId: 'LEAD' }, admin);
      expect(prisma.legendary.update).toHaveBeenCalledWith(expect.objectContaining({ data: { cityLeaderId: 'LEAD' } }));
    });

    it('bloqueia ao atingir o teto de 10', async () => {
      prisma.legendary.count.mockResolvedValue(10);
      await expect(service.assignCityLeader({ legendaryId: 'L1', leaderId: 'LEAD' }, admin)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.legendary.update).not.toHaveBeenCalled();
    });

    it('admin (usuário vinculado) é isento do teto', async () => {
      prisma.legendary.count.mockResolvedValue(10);
      prisma.user.findFirst.mockResolvedValue({ roles: [{ role: { name: 'COORDINATION_ADMIN' } }] });
      await service.assignCityLeader({ legendaryId: 'L1', leaderId: 'LEAD' }, admin);
      expect(prisma.legendary.update).toHaveBeenCalledWith(expect.objectContaining({ data: { cityLeaderId: 'LEAD' } }));
    });

    it('recusa líder de outra cidade', async () => {
      await expect(service.assignCityLeader({ legendaryId: 'L1', leaderId: 'OUTRA' }, admin)).rejects.toThrow('mesma cidade');
    });

    it('recusa líder de si mesmo', async () => {
      await expect(service.assignCityLeader({ legendaryId: 'L1', leaderId: 'L1' }, admin)).rejects.toThrow('si mesmo');
    });

    it('recusa ciclo (o líder é liderado pelo próprio legendário)', async () => {
      prisma.legendary.findFirst.mockImplementation(({ where }: any) =>
        where.id === 'L1'
          ? Promise.resolve({ id: 'L1', city: 'Goiânia', cityLeaderId: null })
          : Promise.resolve({ id: 'LEAD', city: 'Goiânia', cityLeaderId: 'L1' }),
      );
      prisma.legendary.findUnique.mockResolvedValue({ cityLeaderId: 'L1' }); // LEAD é liderado por L1
      await expect(service.assignCityLeader({ legendaryId: 'L1', leaderId: 'LEAD' }, admin)).rejects.toThrow('ciclo');
    });

    it('remove o vínculo com leaderId null', async () => {
      await service.assignCityLeader({ legendaryId: 'L1', leaderId: null }, admin);
      expect(prisma.legendary.update).toHaveBeenCalledWith(expect.objectContaining({ data: { cityLeaderId: null } }));
    });
  });

  describe('assignTeamManager', () => {
    beforeEach(() => {
      prisma.teamMembership.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === 'M1') return Promise.resolve({ id: 'M1', teamId: 'T1', managerMembershipId: null, team: { coordinatorLegendaryId: 'C' } });
        if (where.id === 'M2') return Promise.resolve({ id: 'M2', teamId: 'T1', legendaryId: 'LM2' });
        if (where.id === 'OUTRO') return Promise.resolve({ id: 'OUTRO', teamId: 'T2', legendaryId: 'LX' });
        return Promise.resolve(null);
      });
      prisma.teamMembership.findUnique.mockResolvedValue({ managerMembershipId: null });
    });

    it('atribui sub-coordenador abaixo do teto', async () => {
      prisma.teamMembership.count.mockResolvedValue(2);
      await service.assignTeamManager({ membershipId: 'M1', managerMembershipId: 'M2' }, admin);
      expect(prisma.teamMembership.update).toHaveBeenCalledWith(expect.objectContaining({ data: { managerMembershipId: 'M2' } }));
    });

    it('bloqueia ao atingir o teto de 10', async () => {
      prisma.teamMembership.count.mockResolvedValue(10);
      await expect(service.assignTeamManager({ membershipId: 'M1', managerMembershipId: 'M2' }, admin)).rejects.toBeInstanceOf(ConflictException);
    });

    it('recusa sub-coordenador de outra equipe', async () => {
      await expect(service.assignTeamManager({ membershipId: 'M1', managerMembershipId: 'OUTRO' }, admin)).rejects.toThrow('mesma equipe');
    });
  });
});
