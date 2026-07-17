import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { hasAdminRole } from '../../common/access/access.constants';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { normalizeCityKey } from '../../common/org-chart/org-chart.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssignCityLeaderDto } from './dto/assign-city-leader.dto';
import { AssignTeamManagerDto } from './dto/assign-team-manager.dto';

/** Teto máximo de pessoas por gestor (admin isento). */
export const MANAGEMENT_LIMIT = 10;

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  // ===================== CIDADES: Legendary.cityLeaderId =====================

  async assignCityLeader(dto: AssignCityLeaderDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const legendary = await this.prisma.legendary.findFirst({ where: { id: dto.legendaryId, deletedAt: null } });
    if (!legendary) throw new NotFoundException('Legendário não encontrado.');
    if (!scope.isAdmin) await this.assertLegendaryInScope(scope, legendary.id);

    if (dto.leaderId === null) {
      return this.persistCityLeader(legendary.id, null);
    }
    if (dto.leaderId === legendary.id) {
      throw new BadRequestException('Um legendário não pode ser líder de si mesmo.');
    }
    const leader = await this.prisma.legendary.findFirst({ where: { id: dto.leaderId, deletedAt: null } });
    if (!leader) throw new NotFoundException('Líder não encontrado.');

    if (!legendary.city || normalizeCityKey(leader.city ?? '') !== normalizeCityKey(legendary.city)) {
      throw new BadRequestException('O líder deve ser da mesma cidade do legendário.');
    }
    await this.assertNoCityCycle(leader.id, legendary.id);

    if (!(await this.isLegendaryExempt(leader.id))) {
      const count = await this.prisma.legendary.count({
        where: { cityLeaderId: leader.id, deletedAt: null, id: { not: legendary.id } },
      });
      if (count >= MANAGEMENT_LIMIT) {
        throw new ConflictException(`Este líder já gerencia ${MANAGEMENT_LIMIT} legendários (teto).`);
      }
    }
    return this.persistCityLeader(legendary.id, leader.id);
  }

  private async persistCityLeader(legendaryId: string, leaderId: string | null) {
    const before = await this.prisma.legendary.findUnique({ where: { id: legendaryId }, select: { cityLeaderId: true } });
    const after = await this.prisma.legendary.update({ where: { id: legendaryId }, data: { cityLeaderId: leaderId } });
    await this.audit.create({
      entityType: 'Legendary',
      entityId: legendaryId,
      action: 'assign_city_leader',
      before,
      after: { cityLeaderId: leaderId },
    });
    return after;
  }

  /** Impede ciclo: o pretendido líder não pode ser (transitivamente) liderado pelo legendário. */
  private async assertNoCityCycle(leaderId: string, legendaryId: string) {
    let currentId: string | null = leaderId;
    const seen = new Set<string>();
    while (currentId) {
      if (currentId === legendaryId) throw new BadRequestException('O vínculo criaria um ciclo de liderança.');
      if (seen.has(currentId)) break;
      seen.add(currentId);
      const node: { cityLeaderId: string | null } | null = await this.prisma.legendary.findUnique({
        where: { id: currentId },
        select: { cityLeaderId: true },
      });
      currentId = node?.cityLeaderId ?? null;
    }
  }

  // ===================== EQUIPES: TeamMembership.managerMembershipId =====================

  async assignTeamManager(dto: AssignTeamManagerDto, user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);
    const membership = await this.prisma.teamMembership.findFirst({
      where: { id: dto.membershipId, deletedAt: null },
      include: { team: true },
    });
    if (!membership) throw new NotFoundException('Membership não encontrada.');
    if (!scope.isAdmin) this.accessPolicy.assertTeamAllowed(scope, membership.teamId);

    if (dto.managerMembershipId === null) {
      await this.assertCoordinatorHasRoom(membership);
      return this.persistTeamManager(membership.id, null);
    }
    if (dto.managerMembershipId === membership.id) {
      throw new BadRequestException('Uma membership não pode gerenciar a si mesma.');
    }
    const manager = await this.prisma.teamMembership.findFirst({
      where: { id: dto.managerMembershipId, deletedAt: null },
    });
    if (!manager) throw new NotFoundException('Sub-coordenador (membership) não encontrado.');
    if (manager.teamId !== membership.teamId) {
      throw new BadRequestException('O sub-coordenador deve ser da mesma equipe.');
    }
    await this.assertNoTeamCycle(manager.id, membership.id);

    if (!(await this.isLegendaryExempt(manager.legendaryId))) {
      const count = await this.prisma.teamMembership.count({
        where: { managerMembershipId: manager.id, deletedAt: null, id: { not: membership.id } },
      });
      if (count >= MANAGEMENT_LIMIT) {
        throw new ConflictException(`Este sub-coordenador já gerencia ${MANAGEMENT_LIMIT} integrantes (teto).`);
      }
    }
    return this.persistTeamManager(membership.id, manager.id);
  }

  /** Teto do coordenador da equipe sobre as memberships diretas (managerMembershipId nulo). */
  private async assertCoordinatorHasRoom(membership: { id: string; teamId: string; managerMembershipId: string | null; team: { coordinatorLegendaryId: string | null } }) {
    if (membership.managerMembershipId === null) return; // já é direta — no-op sem consumir vaga nova
    const coordinatorId = membership.team.coordinatorLegendaryId;
    if (coordinatorId && (await this.isLegendaryExempt(coordinatorId))) return;
    const count = await this.prisma.teamMembership.count({
      where: { teamId: membership.teamId, managerMembershipId: null, deletedAt: null, id: { not: membership.id } },
    });
    if (count >= MANAGEMENT_LIMIT) {
      throw new ConflictException(`O coordenador já tem ${MANAGEMENT_LIMIT} pessoas diretas (teto).`);
    }
  }

  private async persistTeamManager(membershipId: string, managerMembershipId: string | null) {
    const before = await this.prisma.teamMembership.findUnique({ where: { id: membershipId }, select: { managerMembershipId: true } });
    const after = await this.prisma.teamMembership.update({ where: { id: membershipId }, data: { managerMembershipId } });
    await this.audit.create({
      entityType: 'TeamMembership',
      entityId: membershipId,
      action: 'assign_team_manager',
      before,
      after: { managerMembershipId },
    });
    return after;
  }

  private async assertNoTeamCycle(managerId: string, membershipId: string) {
    let currentId: string | null = managerId;
    const seen = new Set<string>();
    while (currentId) {
      if (currentId === membershipId) throw new BadRequestException('O vínculo criaria um ciclo de gestão.');
      if (seen.has(currentId)) break;
      seen.add(currentId);
      const node: { managerMembershipId: string | null } | null = await this.prisma.teamMembership.findUnique({
        where: { id: currentId },
        select: { managerMembershipId: true },
      });
      currentId = node?.managerMembershipId ?? null;
    }
  }

  // ===================== Helpers =====================

  /** Gestor isento do teto: legendário cujo usuário vinculado é Administrador. */
  private async isLegendaryExempt(legendaryId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { legendaryId, deletedAt: null, isActive: true },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (!user) return false;
    return hasAdminRole(user.roles.map((r) => r.role.name));
  }

  private async assertLegendaryInScope(scope: any, legendaryId: string) {
    const inScope = await this.prisma.legendary.findFirst({
      where: { id: legendaryId, AND: [this.accessPolicy.buildLegendaryWhere(scope)] },
      select: { id: true },
    });
    if (!inScope) throw new ForbiddenException('Legendário fora do seu escopo.');
  }
}
