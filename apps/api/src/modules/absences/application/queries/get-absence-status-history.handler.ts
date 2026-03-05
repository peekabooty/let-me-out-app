import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbsenceStatus } from '@repo/types';

import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { GetAbsenceStatusHistoryQuery } from './get-absence-status-history.query';

export interface AbsenceStatusHistoryItemDto {
  id: string;
  absenceId: string;
  fromStatus: AbsenceStatus | null;
  toStatus: AbsenceStatus;
  changedBy: string;
  changedAt: string;
}

/**
 * Query handler for getting the status history of an absence.
 *
 * Implements:
 * - RF-53: Records status changes in absence_status_history
 * - RF-54: History visible to creator and assigned validators
 */
@Injectable()
@QueryHandler(GetAbsenceStatusHistoryQuery)
export class GetAbsenceStatusHistoryHandler implements IQueryHandler<
  GetAbsenceStatusHistoryQuery,
  AbsenceStatusHistoryItemDto[]
> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  async execute(query: GetAbsenceStatusHistoryQuery): Promise<AbsenceStatusHistoryItemDto[]> {
    const absence = await this.absenceRepository.findById(query.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${query.absenceId} not found`);
    }

    // RF-54: Only involved users (creator + validators) can view status history
    const assignedValidators = await this.absenceRepository.getAssignedValidators(query.absenceId);
    const isCreator = absence.userId === query.userId;
    const isValidator = assignedValidators.includes(query.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException('You do not have access to this absence status history');
    }

    const history = await this.absenceRepository.getStatusHistory(query.absenceId);

    return history.map((record) => ({
      id: record.id,
      absenceId: query.absenceId,
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      changedBy: record.changedBy,
      changedAt: record.changedAt.toISOString(),
    }));
  }
}
