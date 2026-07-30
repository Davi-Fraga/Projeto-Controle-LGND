import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizeName } from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProfessionDto } from './dto/create-profession.dto';
import { UpdateProfessionDto } from './dto/update-profession.dto';

/**
 * Resultado da resolução de profissão por nome (change profissao-livre-vinculo-catalogo).
 * `matched` é o ÚNICO caso que produz vínculo; `notFound`/`ambiguous` preservam o texto
 * aparado e forçam revisão humana.
 */
export type ProfessionResolution =
  | { outcome: 'empty' }
  | { outcome: 'matched'; professionId: string; name: string }
  | { outcome: 'notFound'; text: string }
  | { outcome: 'ambiguous'; text: string; candidateIds: string[] };

@Injectable()
export class ProfessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.profession.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  /**
   * Caminho ÚNICO de resolução de profissão por nome — usado pelo cadastro manual
   * (`LegendariosService`), pelo sync do Forms e pela reconciliação retroativa.
   *
   * Aparra o valor, aplica `normalizeName` (compartilhado) e compara com o nome
   * normalizado das profissões ATIVAS. Vincula somente quando a correspondência é
   * inequívoca: `Profession.name @unique` diferencia acento/caixa/espaço, então duas
   * profissões ativas podem normalizar para a mesma chave — nesse caso o resultado é
   * `ambiguous` e NENHUM id é escolhido arbitrariamente.
   *
   * SEM efeitos colaterais: nunca executa `create`/`upsert` de `Profession` ou alias.
   */
  async resolveByName(value: string | null | undefined): Promise<ProfessionResolution> {
    const text = value?.trim();
    if (!text) return { outcome: 'empty' };

    const target = normalizeName(text);
    if (!target) return { outcome: 'empty' };

    const professions = await this.prisma.profession.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const matches = professions.filter((p) => normalizeName(p.name) === target);

    if (matches.length === 1) return { outcome: 'matched', professionId: matches[0].id, name: matches[0].name };
    if (matches.length > 1) return { outcome: 'ambiguous', text, candidateIds: matches.map((p) => p.id) };
    return { outcome: 'notFound', text };
  }

  async create(dto: CreateProfessionDto, actorUserId?: string) {
    await this.ensureNameAvailable(dto.name);
    const profession = await this.prisma.profession.create({ data: { name: dto.name.trim() } });
    await this.audit.create({ actorUserId, entityType: 'Profession', entityId: profession.id, action: 'create', after: profession });
    return profession;
  }

  async update(id: string, dto: UpdateProfessionDto, actorUserId?: string) {
    const before = await this.prisma.profession.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new NotFoundException('Profession not found.');
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    const after = await this.prisma.profession.update({ where: { id }, data: { name: dto.name?.trim() } });
    await this.audit.create({ actorUserId, entityType: 'Profession', entityId: id, action: 'update', before, after });
    return after;
  }

  private async ensureNameAvailable(name: string, currentId?: string) {
    const existing = await this.prisma.profession.findUnique({ where: { name: name.trim() } });
    if (existing && existing.id !== currentId) throw new BadRequestException('Profession already exists.');
  }
}
