import { Injectable } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

import { PrismaService } from '../../../prisma/prisma.service';
import type {
  AbsenceAuditRepositoryPort,
  AuditAbsenceFilters,
  AuditAbsencePage,
} from '../domain/ports/absence-audit.repository.port';

interface AuditAbsencePrismaRecord {
  id: string;
  user_id: string;
  absence_type_id: string;
  start_at: Date;
  end_at: Date;
  duration: unknown;
  status: string | null;
  created_at: Date;
  updated_at: Date;
  user: { name: string };
  absence_type: { name: string };
}

type PrismaAbsenceWhereInput = {
  status?: string;
  start_at?: { gte?: Date; lte?: Date };
  end_at?: { gte?: Date; lte?: Date };
  user_id?: string;
  user?: {
    team_memberships?: {
      some: {
        team_id: string;
      };
    };
  };
};

@Injectable()
export class AuditPrismaRepository implements AbsenceAuditRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAuditAbsencesPage(params: {
    cursor?: string;
    limit: number;
    filters: AuditAbsenceFilters;
  }): Promise<AuditAbsencePage> {
    const where = this.buildWhere(params.filters);

    const records = (await this.prisma.absence.findMany({
      where,
      include: {
        user: { select: { name: true } },
        absence_type: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
      take: params.limit + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
    })) as AuditAbsencePrismaRecord[];

    return this.toPage(records, params.limit);
  }

  async findUserAbsencesPageForExport(params: {
    userId: string;
    cursor?: string;
    limit: number;
    filters: Omit<AuditAbsenceFilters, 'teamId'>;
  }): Promise<AuditAbsencePage> {
    const where = this.buildWhere(params.filters);
    where.user_id = params.userId;

    const records = (await this.prisma.absence.findMany({
      where,
      include: {
        user: { select: { name: true } },
        absence_type: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
      take: params.limit + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
    })) as AuditAbsencePrismaRecord[];

    return this.toPage(records, params.limit);
  }

  private toPage(records: AuditAbsencePrismaRecord[], limit: number): AuditAbsencePage {
    const hasMore = records.length > limit;
    const pageItems = hasMore ? records.slice(0, limit) : records;

    return {
      items: pageItems.map((record) => ({
        id: record.id,
        userId: record.user_id,
        userName: record.user.name,
        absenceTypeId: record.absence_type_id,
        absenceTypeName: record.absence_type.name,
        startAt: record.start_at,
        endAt: record.end_at,
        duration: Number(record.duration),
        status: record.status as AbsenceStatus | null,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })),
      nextCursor: hasMore ? (pageItems.at(-1)?.id ?? null) : null,
    };
  }

  private buildWhere(filters: AuditAbsenceFilters): PrismaAbsenceWhereInput {
    const where: PrismaAbsenceWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.start_at = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    if (filters.teamId) {
      where.user = {
        team_memberships: {
          some: {
            team_id: filters.teamId,
          },
        },
      };
    }

    return where;
  }
}
