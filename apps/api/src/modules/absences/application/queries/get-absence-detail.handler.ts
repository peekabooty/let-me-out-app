import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbsenceStatus } from '@repo/types';

import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { GetAbsenceDetailQuery } from './get-absence-detail.query';

export interface AbsenceDetailResponseDto {
  id: string;
  userId: string;
  absenceTypeId: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
  validatorIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Query handler for getting the detail of a specific absence.
 *
 * Implements RF-54: Status history visible to the creator, assigned validators, and auditors.
 * Access is restricted to the absence creator and assigned validators.
 */
@Injectable()
@QueryHandler(GetAbsenceDetailQuery)
export class GetAbsenceDetailHandler implements IQueryHandler<
  GetAbsenceDetailQuery,
  AbsenceDetailResponseDto
> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  async execute(query: GetAbsenceDetailQuery): Promise<AbsenceDetailResponseDto> {
    const absence = await this.absenceRepository.findById(query.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${query.absenceId} not found`);
    }

    // RF-54: Only involved users (creator + validators) can view absence detail
    const assignedValidators = await this.absenceRepository.getAssignedValidators(query.absenceId);
    const isCreator = absence.userId === query.userId;
    const isValidator = assignedValidators.includes(query.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException('You do not have access to this absence');
    }

    return {
      id: absence.id,
      userId: absence.userId,
      absenceTypeId: absence.absenceTypeId,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
      validatorIds: assignedValidators,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    };
  }
}
