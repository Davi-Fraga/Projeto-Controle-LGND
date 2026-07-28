import { Injectable } from '@nestjs/common';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async rotaDoCerrado(user: AuthenticatedUser) {
    const scope = await this.accessPolicy.resolveScope(user);

    const legendaryWhere: any = { deletedAt: null, isFromRotaDoCerrado: true };
    if (!scope.isAdmin) {
      legendaryWhere.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }

    const [byCity, churchIds, total] = await Promise.all([
      this.prisma.legendary.groupBy({
        by: ['city'],
        where: legendaryWhere,
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
      }),
      this.prisma.legendary.findMany({
        where: { ...legendaryWhere, churchId: { not: null } },
        select: { churchId: true },
        distinct: ['churchId'],
      }),
      this.prisma.legendary.count({ where: legendaryWhere }),
    ]);

    // A contagem por igreja carrega o MESMO recorte da listagem: sem isso ela entregava o
    // total real da igreja a um usuário escopado — o escopo vale para agregados também.
    const churchCountWhere: any = { deletedAt: null, isFromRotaDoCerrado: true };
    if (!scope.isAdmin) {
      churchCountWhere.AND = [this.accessPolicy.buildLegendaryWhere(scope)];
    }

    const churches = churchIds.length
      ? await this.prisma.church.findMany({
          where: { id: { in: churchIds.map((l) => l.churchId!) }, deletedAt: null },
          select: {
            id: true,
            name: true,
            city: true,
            latitude: true,
            longitude: true,
            _count: {
              select: {
                legendarios: { where: churchCountWhere },
              },
            },
          },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      summary: {
        total,
        cities: byCity.filter((item) => item.city).length,
        churches: churches.length,
      },
      byCity: byCity.map((item) => ({
        city: item.city ?? 'Não informado',
        count: item._count._all,
      })),
      churches: churches.map((church) => ({
        id: church.id,
        name: church.name,
        city: church.city,
        latitude: church.latitude,
        longitude: church.longitude,
        count: church._count.legendarios,
      })),
    };
  }
}
