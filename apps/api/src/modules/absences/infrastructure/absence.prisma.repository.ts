import { Injectable } from '@nestjs/common';
import { AbsenceStatus, AbsenceUnit, ValidationDecision } from '@repo/types';
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

  async createValidationHistory(
    absenceId: string,
    validatorId: string,
    decision: ValidationDecision,
    decidedAt: Date
  ): Promise<void> {
    await this.prisma.absence_validation_history.create({
      data: {
        id: generateId(),
        absence_id: absenceId,
        validator_id: validatorId,
        decision,
        decided_at: decidedAt,
      },
    });
  }

  async getValidationHistory(
    absenceId: string
  ): Promise<Array<{ validatorId: string; decision: ValidationDecision; decidedAt: Date }>> {
    const records = await this.prisma.absence_validation_history.findMany({
      where: { absence_id: absenceId },
      orderBy: { decided_at: 'desc' },
    });

    return records.map((record) => ({
      validatorId: record.validator_id,
      decision: record.decision as ValidationDecision,
      decidedAt: record.decided_at,
    }));
  }

  async getAssignedValidators(absenceId: string): Promise<string[]> {
    // The validators are stored in the absence_validator junction table
    const validators = await this.prisma.absence_validator.findMany({
      where: { absence_id: absenceId },
      select: { validator_id: true },
    });

    return validators.map((v: { validator_id: string }) => v.validator_id);
  }

  async assignValidators(
    absenceId: string,
    validatorIds: string[],
    assignedAt: Date
  ): Promise<void> {
    await this.prisma.absence_validator.createMany({
      data: validatorIds.map((validatorId) => ({
        absence_id: absenceId,
        validator_id: validatorId,
        assigned_at: assignedAt,
      })),
    });
  }

  /**
   * Gets absences for the calendar view (RF-46, RF-69, RF-70).
   *
   * Returns:
   * - All absences of the specified user
   * - All absences of team members in teams the user belongs to
   * - Includes user name, absence type name, and team color
   *
   * The query is optimized with proper joins to avoid N+1 queries.
   */
  async findCalendarAbsences(userId: string): Promise<
    Array<{
      id: string;
      userId: string;
      userName: string;
      absenceTypeId: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      status: AbsenceStatus | null;
      teamColor: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    // First, get the user's own absences
    const ownAbsences = await this.prisma.absence.findMany({
      where: { user_id: userId },
      include: {
        user: { select: { name: true } },
        absence_type: { select: { name: true } },
      },
      orderBy: { start_at: 'asc' },
    });

    // Get team IDs where the user is a member
    const userTeams = await this.prisma.team_member.findMany({
      where: { user_id: userId },
      select: { team_id: true },
    });

    const teamIds = userTeams.map((tm) => tm.team_id);

    // Get absences of team members (excluding the user's own absences)
    const teamAbsences = await this.prisma.absence.findMany({
      where: {
        user_id: { not: userId },
        user: {
          team_memberships: {
            some: {
              team_id: { in: teamIds },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            team_memberships: {
              where: { team_id: { in: teamIds } },
              include: { team: { select: { color: true } } },
            },
          },
        },
        absence_type: { select: { name: true } },
      },
      orderBy: { start_at: 'asc' },
    });

    // Map own absences (no team color)
    const mappedOwnAbsences = ownAbsences.map((absence) => ({
      id: absence.id,
      userId: absence.user_id,
      userName: absence.user.name,
      absenceTypeId: absence.absence_type_id,
      absenceTypeName: absence.absence_type.name,
      startAt: absence.start_at,
      endAt: absence.end_at,
      duration: Number(absence.duration),
      status: absence.status as AbsenceStatus | null,
      teamColor: null,
      createdAt: absence.created_at,
      updatedAt: absence.updated_at,
    }));

    // Map team absences (with team color)
    const mappedTeamAbsences = teamAbsences.map((absence) => {
      // Get the first matching team color (a user might be in multiple teams)
      const teamColor = absence.user.team_memberships[0]?.team.color ?? null;

      return {
        id: absence.id,
        userId: absence.user_id,
        userName: absence.user.name,
        absenceTypeId: absence.absence_type_id,
        absenceTypeName: absence.absence_type.name,
        startAt: absence.start_at,
        endAt: absence.end_at,
        duration: Number(absence.duration),
        status: absence.status as AbsenceStatus | null,
        teamColor,
        createdAt: absence.created_at,
        updatedAt: absence.updated_at,
      };
    });

    // Combine and sort by start date
    return [...mappedOwnAbsences, ...mappedTeamAbsences].sort((a, b) =>
      a.startAt < b.startAt ? -1 : 1
    );
  }

  /**
   * Finds upcoming absences for a user (RF-55).
   *
   * Returns absences with startAt >= current date, ordered by startAt ASC.
   * Limited to 10 most recent upcoming absences.
   */
  async findUpcomingAbsences(userId: string): Promise<
    Array<{
      id: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      status: AbsenceStatus | null;
    }>
  > {
    const now = new Date();

    const absences = await this.prisma.absence.findMany({
      where: {
        user_id: userId,
        start_at: {
          gte: now,
        },
      },
      include: {
        absence_type: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        start_at: 'asc',
      },
      take: 10,
    });

    return absences.map((absence) => ({
      id: absence.id,
      absenceTypeName: absence.absence_type.name,
      startAt: absence.start_at,
      endAt: absence.end_at,
      duration: Number(absence.duration),
      status: absence.status as AbsenceStatus | null,
    }));
  }

  /**
   * Finds absences pending validation by a specific validator (RF-55).
   *
   * Returns absences where:
   * - The validator is assigned to the absence
   * - The absence status is WAITING_VALIDATION or RECONSIDER
   * - Ordered by createdAt ASC (oldest first)
   */
  async findPendingValidations(validatorId: string): Promise<
    Array<{
      id: string;
      userName: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      createdAt: Date;
    }>
  > {
    const absences = await this.prisma.absence.findMany({
      where: {
        status: {
          in: [AbsenceStatus.WAITING_VALIDATION, AbsenceStatus.RECONSIDER],
        },
        assigned_validators: {
          some: {
            validator_id: validatorId,
          },
        },
      },
      include: {
        user: true,
        absence_type: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return absences.map((absence) => ({
      id: absence.id,
      userName: absence.user.name,
      absenceTypeName: absence.absence_type.name,
      startAt: absence.start_at,
      endAt: absence.end_at,
      duration: Number(absence.duration),
      createdAt: absence.created_at,
    }));
  }
}
