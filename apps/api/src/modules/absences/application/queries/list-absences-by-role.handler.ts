import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRole, type AbsenceStatus } from '@repo/types';

import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { ListAbsencesByRoleQuery } from './list-absences-by-role.query';

export interface AbsenceListItemDto {
  id: string;
  absenceTypeId: string;
  absenceTypeName: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query handler for listing absences filtered by the caller's role.
 *
 * RF-38: STANDARD users see only their own absences.
 * RF-39: VALIDATOR users see their own absences plus those where they are
 *        an assigned validator (deduplicated).
 * RF-40: AUDITOR users see all absences in read-only mode.
 * RF-41: ADMIN users have no access to absence management.
 */
@Injectable()
@QueryHandler(ListAbsencesByRoleQuery)
export class ListAbsencesByRoleHandler implements IQueryHandler<
  ListAbsencesByRoleQuery,
  AbsenceListItemDto[]
> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  async execute(query: ListAbsencesByRoleQuery): Promise<AbsenceListItemDto[]> {
    const { userId, role } = query;

    switch (role) {
      case UserRole.STANDARD: {
        const absences = await this.absenceRepository.findByUserId(userId);
        return absences.map(this.toDto);
      }

      case UserRole.VALIDATOR: {
        const [own, assigned] = await Promise.all([
          this.absenceRepository.findByUserId(userId),
          this.absenceRepository.findByValidatorId(userId),
        ]);

        // Merge and deduplicate by absence ID; own absences take precedence
        const seen = new Set<string>();
        const merged: typeof own = [];

        for (const absence of [...own, ...assigned]) {
          if (!seen.has(absence.id)) {
            seen.add(absence.id);
            merged.push(absence);
          }
        }

        // Sort merged list by startAt DESC
        merged.sort((a, b) => (a.startAt > b.startAt ? -1 : 1));
        return merged.map(this.toDto);
      }

      case UserRole.AUDITOR: {
        const absences = await this.absenceRepository.findAll();
        return absences.map(this.toDto);
      }

      case UserRole.ADMIN:
        throw new ForbiddenException('Administrators do not have access to absence management');

      default:
        throw new ForbiddenException('Access denied');
    }
  }

  private toDto(absence: {
    id: string;
    absenceTypeId: string;
    absenceTypeName: string;
    startAt: Date;
    endAt: Date;
    duration: number;
    status: AbsenceStatus | null;
    createdAt: Date;
    updatedAt: Date;
  }): AbsenceListItemDto {
    return {
      id: absence.id,
      absenceTypeId: absence.absenceTypeId,
      absenceTypeName: absence.absenceTypeName,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    };
  }
}
