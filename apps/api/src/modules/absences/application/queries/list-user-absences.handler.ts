import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbsenceStatus } from '@repo/types';

import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { ListUserAbsencesQuery } from './list-user-absences.query';

export interface UserAbsenceItemDto {
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
 * Query handler for listing all absences of the authenticated user.
 *
 * Returns absences ordered by startAt DESC.
 */
@Injectable()
@QueryHandler(ListUserAbsencesQuery)
export class ListUserAbsencesHandler implements IQueryHandler<
  ListUserAbsencesQuery,
  UserAbsenceItemDto[]
> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  async execute(query: ListUserAbsencesQuery): Promise<UserAbsenceItemDto[]> {
    const absences = await this.absenceRepository.findByUserId(query.userId);

    return absences.map((absence) => ({
      id: absence.id,
      absenceTypeId: absence.absenceTypeId,
      absenceTypeName: absence.absenceTypeName,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    }));
  }
}
