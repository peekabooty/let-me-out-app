import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import type { CalendarAbsenceResponseDto } from '../dtos/calendar-absence-response.dto';
import { GetCalendarAbsencesQuery } from './get-calendar-absences.query';

/**
 * Query handler for getting calendar absences.
 *
 * Implements:
 * - RF-46: Calendar view showing all user's absences
 * - RF-69: Show team members' absences
 * - RF-70: Different colors for own vs team absences
 */
@Injectable()
@QueryHandler(GetCalendarAbsencesQuery)
export class GetCalendarAbsencesHandler implements IQueryHandler<
  GetCalendarAbsencesQuery,
  CalendarAbsenceResponseDto[]
> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  async execute(query: GetCalendarAbsencesQuery): Promise<CalendarAbsenceResponseDto[]> {
    const absences = await this.absenceRepository.findCalendarAbsences(query.userId);

    return absences.map((absence) => ({
      id: absence.id,
      userId: absence.userId,
      userName: absence.userName,
      absenceTypeId: absence.absenceTypeId,
      absenceTypeName: absence.absenceTypeName,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
      isOwn: absence.userId === query.userId,
      teamColor: absence.teamColor,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    }));
  }
}
