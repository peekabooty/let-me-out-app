import { Injectable } from '@nestjs/common';
import { AbsenceStatus, AbsenceUnit } from '@repo/types';
import { startOfYear, endOfYear } from 'date-fns';

import { PrismaService } from '../../../prisma/prisma.service';
import { generateId } from '../../../common';
import { Absence } from '../domain/absence.entity';
import type { AbsenceRepositoryPort } from '../domain/ports/absence.repository.port';
import { AbsenceMapper } from './absence.mapper';

@Injectable()
export class AbsencePrismaRepository implements AbsenceRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AbsenceMapper
  ) {}

  async findById(id: string): Promise<Absence | null> {
    const record = await this.prisma.absence.findUnique({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async save(absence: Absence): Promise<void> {
    await this.prisma.absence.create({
      data: {
        id: absence.id,
        user_id: absence.userId,
        absence_type_id: absence.absenceTypeId,
        start_at: absence.startAt,
        end_at: absence.endAt,
        duration: absence.duration,
        status: absence.status,
        created_at: absence.createdAt,
        updated_at: absence.updatedAt,
      },
    });
  }

  async update(absence: Absence): Promise<void> {
    await this.prisma.absence.update({
      where: { id: absence.id },
      data: {
        start_at: absence.startAt,
        end_at: absence.endAt,
        duration: absence.duration,
        status: absence.status,
        updated_at: absence.updatedAt,
      },
    });
  }

  async createStatusHistory(
    absenceId: string,
    fromStatus: AbsenceStatus | null,
    toStatus: AbsenceStatus,
    changedBy: string,
    changedAt: Date
  ): Promise<void> {
    await this.prisma.absence_status_history.create({
      data: {
        id: generateId(),
        absence_id: absenceId,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: changedBy,
        changed_at: changedAt,
      },
    });
  }

  /**
   * Calculates the total consumed duration for a user's absences of a specific type
   * within a given year.
   *
   * The unit parameter is part of the port interface but not used in this implementation
   * because duration is stored as a single numeric value in the database, regardless of unit.
   */
  async calculateConsumedByUserAndTypeInYear(
    userId: string,
    absenceTypeId: string,
    year: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _unit: AbsenceUnit
  ): Promise<number> {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Only count absences that are ACCEPTED or WAITING_VALIDATION
    // (RF-25: requests that are discarded or cancelled shouldn't count)
    const result = await this.prisma.absence.aggregate({
      _sum: {
        duration: true,
      },
      where: {
        user_id: userId,
        absence_type_id: absenceTypeId,
        start_at: {
          gte: yearStart,
          lte: yearEnd,
        },
        status: {
          in: [AbsenceStatus.ACCEPTED, AbsenceStatus.WAITING_VALIDATION],
        },
      },
    });

    return result._sum.duration ? Number(result._sum.duration) : 0;
  }

  async hasOverlap(
    userId: string,
    startAt: Date,
    endAt: Date,
    excludeAbsenceId?: string
  ): Promise<boolean> {
    // Check for overlapping absences:
    // An overlap exists if:
    // - start_at < endAt AND end_at > startAt
    // - Only check absences that are not cancelled or discarded (RF-50)
    const whereClause: {
      user_id: string;
      status: { notIn: AbsenceStatus[] };
      AND: Array<{ start_at: { lt: Date } } | { end_at: { gt: Date } }>;
      id?: { not: string };
    } = {
      user_id: userId,
      status: {
        notIn: [AbsenceStatus.CANCELLED, AbsenceStatus.DISCARDED],
      },
      AND: [{ start_at: { lt: endAt } }, { end_at: { gt: startAt } }],
    };

    if (excludeAbsenceId) {
      whereClause.id = { not: excludeAbsenceId };
    }

    const count = await this.prisma.absence.count({
      where: whereClause,
    });

    return count > 0;
  }
}
