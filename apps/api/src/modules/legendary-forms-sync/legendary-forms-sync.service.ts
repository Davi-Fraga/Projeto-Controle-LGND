import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  LegendaryHistoryType,
  LegendaryStatus,
  TeamMembershipStatus,
  canonCity,
  cleanLgnd,
  cleanPhone,
  normalizeName,
} from '@central-da-manada/shared';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FormsSyncWebhookDto } from './dto/forms-sync-webhook.dto';

export type FormsSyncResult = {
  result: 'created' | 'updated' | 'conflict' | 'skipped';
  legendaryId: string;
  reason?: 'duplicate' | 'stale';
  needsReview?: boolean;
  issues?: string[];
};

/**
 * Sincronização CONTÍNUA de legendários a partir do Google Forms da manada.
 * Upsert DIRETO em `Legendary` (sem aprovação). NÃO confundir com pré-inscrição
 * de TOP (`TopPreRegistration`), que é fluxo separado com aprovação.
 *
 * Regras (change `sincronizar-legendarios-via-forms`):
 *  - chave = lgndNumber (âncora) + nome normalizado (confirmação exata, sem fuzzy)
 *  - conflito número-vs-nome → needsReview, sem sobrescrever identidade
 *  - last-write-wins por timestamp da resposta; idempotência por responseId
 *  - igreja/profissão sem match → needsReview (nunca cria no runtime)
 */
@Injectable()
export class LegendaryFormsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * @param db  Transação já aberta pelo chamador (opcional). Quando presente, o serviço
   *   PARTICIPA dela em vez de abrir a sua — é o caminho do backfill em lote, que roda
   *   todas as linhas numa transação única e dá ROLLBACK no dry-run. Sem `db`, o
   *   comportamento é o de produção: uma transação por resposta (webhook).
   */
  async ingest(payload: FormsSyncWebhookDto, db?: Prisma.TransactionClient): Promise<FormsSyncResult> {
    const client = db ?? this.prisma;
    const lgndNumber = cleanLgnd(payload.lgndNumber);
    const fullName = payload.fullName?.trim();
    if (!lgndNumber || !fullName) {
      throw new BadRequestException('lgndNumber e fullName são obrigatórios (âncoras de identidade).');
    }
    const responseTimestamp = new Date(payload.responseTimestamp);
    if (Number.isNaN(responseTimestamp.getTime())) {
      throw new BadRequestException('responseTimestamp inválido.');
    }

    const existing = await client.legendary.findUnique({ where: { lgndNumber } });

    // Idempotência: mesma resposta já processada (aplicada ou marcada como conflito) → no-op.
    if (existing?.formsResponseId && existing.formsResponseId === payload.responseId) {
      return { result: 'skipped', reason: 'duplicate', legendaryId: existing.id };
    }
    // Last-write-wins: resposta mais antiga que a última APLICADA não sobrescreve.
    if (existing?.lastFormsSyncAt && responseTimestamp <= existing.lastFormsSyncAt) {
      return { result: 'skipped', reason: 'stale', legendaryId: existing.id };
    }
    // Conflito número-vs-nome: número existe mas o nome diverge → não sobrescrever.
    if (existing && normalizeName(existing.fullName) !== normalizeName(fullName)) {
      return this.handleConflict(existing, payload, responseTimestamp, db);
    }

    // ---- Resolução de vínculos + issues de validação (não bloqueiam) ----
    const issues: string[] = [];
    const churchId = await this.resolveChurchByName(payload.churchName ?? null);
    const professionId = await this.resolveProfessionByName(payload.profession ?? null);
    const { teamId, unmatched: teamUnmatched } = await this.resolveTeamByName(payload.team ?? null);

    if (payload.churchName?.trim() && !churchId) issues.push(`Igreja não encontrada: ${payload.churchName.trim()}`);
    if (payload.profession?.trim() && !professionId) issues.push(`Profissão não encontrada: ${payload.profession.trim()}`);
    if (teamUnmatched) issues.push(`Equipe não encontrada: ${teamUnmatched}`);
    if (payload.isSpiritualLeader) issues.push('Declarou-se líder espiritual — revisar liderança.');

    const emailA = normalizeName(payload.email ?? null);
    const emailB = normalizeName(payload.emailConfirmation ?? null);
    if (emailA && emailB && emailA !== emailB) issues.push('E-mail e confirmação divergem.');

    let birthDate: Date | null = null;
    if (payload.birthDate) {
      const d = new Date(payload.birthDate);
      if (Number.isNaN(d.getTime())) issues.push(`Data de nascimento inválida: ${payload.birthDate}`);
      else birthDate = d;
    }

    // Campos obrigatórios do Forms ausentes → issue (mas ainda faz upsert).
    for (const [label, value] of [
      ['telefone', payload.phone], ['e-mail', payload.email], ['bairro', payload.district],
      ['cidade', payload.city], ['estado', payload.state], ['igreja', payload.churchName],
      ['profissão', payload.profession], ['esposa/mãe', payload.relativeName],
    ] as const) {
      if (!value?.trim()) issues.push(`Campo obrigatório ausente: ${label}`);
    }

    const needsReview = issues.length > 0 || Boolean(existing?.needsReview);
    const city = canonCity(payload.city ?? null);

    const data: Prisma.LegendaryUncheckedUpdateInput & Prisma.LegendaryUncheckedCreateInput = {
      fullName,
      lgndNumber,
      phone: cleanPhone(payload.phone ?? null),
      city,
      searchText: normalizeName([fullName, city, lgndNumber].filter(Boolean).join(' ')),
      churchId: churchId ?? null,
      professionId: professionId ?? null,
      email: payload.email?.trim() || null,
      birthDate,
      district: payload.district?.trim() || null,
      state: payload.state?.trim() || null,
      spiritualLeaderName: payload.spiritualLeaderName?.trim() || null,
      spiritualLeaderPhone: cleanPhone(payload.spiritualLeaderPhone ?? null),
      skillsText: payload.skills?.trim() || null,
      relativeName: payload.relativeName?.trim() || null,
      relativePhone: cleanPhone(payload.relativePhone ?? null),
      relativeEmail: payload.relativeEmail?.trim() || null,
      isSpiritualLeader: Boolean(payload.isSpiritualLeader),
      leadershipRole: payload.leadershipRole?.trim() || null,
      firstTopExternalText: payload.firstMountainTop?.trim() || existing?.firstTopExternalText || null,
      needsReview,
      lastFormsSyncAt: responseTimestamp,
      formsResponseId: payload.responseId,
    };

    return this.runInTransaction(db, async (tx) => {
      let legendary;
      let result: 'created' | 'updated';
      if (existing) {
        legendary = await tx.legendary.update({ where: { id: existing.id }, data });
        result = 'updated';
      } else {
        legendary = await tx.legendary.create({
          data: { ...data, isFromRotaDoCerrado: true, status: LegendaryStatus.ACTIVE },
        });
        result = 'created';
      }

      if (teamId) await this.ensureMembership(tx, teamId, legendary.id);

      await this.audit.create(
        { entityType: 'Legendary', entityId: legendary.id, action: 'forms_sync', before: existing ?? undefined, after: legendary },
        tx,
      );
      await tx.legendaryHistory.create({
        data: {
          legendaryId: legendary.id,
          type: existing ? LegendaryHistoryType.LEGENDARY_UPDATED : LegendaryHistoryType.LEGENDARY_CREATED,
          title: existing ? 'Atualizado via Google Forms' : 'Criado via Google Forms',
          teamId: teamId ?? null,
          metadata: {
            source: 'google-forms',
            responseId: payload.responseId,
            responseTimestamp: payload.responseTimestamp,
            result,
            issues,
          },
          occurredAt: responseTimestamp,
        },
      });

      return { result, legendaryId: legendary.id, needsReview, issues };
    });
  }

  /** Número existe mas o nome diverge: protege contra número digitado errado. */
  private async handleConflict(
    existing: { id: string; fullName: string; notes: string | null },
    payload: FormsSyncWebhookDto,
    responseTimestamp: Date,
    db?: Prisma.TransactionClient,
  ): Promise<FormsSyncResult> {
    const marker = `[CONFLITO Forms responseId=${payload.responseId}] nome recebido="${payload.fullName}" difere do cadastrado="${existing.fullName}"`;
    const notes = existing.notes?.includes(payload.responseId)
      ? existing.notes
      : [existing.notes, marker].filter(Boolean).join('\n');

    await this.runInTransaction(db, async (tx) => {
      const updated = await tx.legendary.update({
        where: { id: existing.id },
        // Só sinaliza revisão e registra o conflito; NÃO sobrescreve identidade nem
        // avança lastFormsSyncAt. Grava formsResponseId para idempotência do reenvio.
        data: { needsReview: true, notes, formsResponseId: payload.responseId },
      });
      await this.audit.create(
        { entityType: 'Legendary', entityId: existing.id, action: 'forms_sync_conflict', before: existing, after: updated },
        tx,
      );
      await tx.legendaryHistory.create({
        data: {
          legendaryId: existing.id,
          type: LegendaryHistoryType.LEGENDARY_UPDATED,
          title: 'Conflito número-vs-nome (Google Forms)',
          description: marker,
          metadata: {
            source: 'google-forms',
            responseId: payload.responseId,
            responseTimestamp: payload.responseTimestamp,
            result: 'conflict',
            received: payload.fullName,
            stored: existing.fullName,
          },
          occurredAt: responseTimestamp,
        },
      });
    });

    return { result: 'conflict', legendaryId: existing.id, needsReview: true };
  }

  /**
   * Executa `fn` na transação injetada (`db`), quando o chamador já abriu uma; senão
   * abre a própria (`$transaction`). Permite ao backfill rodar todas as linhas numa
   * transação única e dar ROLLBACK no dry-run, SEM alterar o comportamento de produção
   * (sem `db`, é exatamente uma transação por resposta, como antes).
   */
  private runInTransaction<T>(
    db: Prisma.TransactionClient | undefined,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return db ? fn(db) : this.prisma.$transaction(fn);
  }

  private async ensureMembership(tx: Prisma.TransactionClient, teamId: string, legendaryId: string) {
    const existing = await tx.teamMembership.findFirst({ where: { teamId, legendaryId, deletedAt: null } });
    if (existing) return;
    await tx.teamMembership.create({
      data: { teamId, legendaryId, role: 'Membro', status: TeamMembershipStatus.ACTIVE },
    });
  }

  /** Resolve Team por nome normalizado. NÃO cria team novo a partir do Forms. */
  private async resolveTeamByName(name: string | null): Promise<{ teamId?: string; unmatched?: string }> {
    const raw = name?.trim();
    if (!raw) return {};
    const target = normalizeName(raw);
    const teams = await this.prisma.team.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
    const match = teams.find((t) => normalizeName(t.name) === target);
    return match ? { teamId: match.id } : { unmatched: raw };
  }

  /** Resolve Church por nome normalizado. NÃO cria church no runtime (D11). */
  private async resolveChurchByName(name: string | null): Promise<string | undefined> {
    const raw = name?.trim();
    if (!raw) return undefined;
    const target = normalizeName(raw);
    const churches = await this.prisma.church.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
    return churches.find((c) => normalizeName(c.name) === target)?.id;
  }

  /** Resolve Profession por nome normalizado. NÃO cria profissão a partir do Forms. */
  private async resolveProfessionByName(name: string | null): Promise<string | undefined> {
    const raw = name?.trim();
    if (!raw) return undefined;
    const target = normalizeName(raw);
    const professions = await this.prisma.profession.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
    return professions.find((p) => normalizeName(p.name) === target)?.id;
  }
}
