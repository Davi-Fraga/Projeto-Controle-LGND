import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: {
      actorUserId?: string;
      entityType: string;
      entityId?: string;
      action: string;
      before?: any;
      after?: any;
      ipAddress?: string;
      userAgent?: string;
    },
    db: Prisma.TransactionClient = this.prisma,
  ) {
    return db.auditLog.create({ data });
  }
}
