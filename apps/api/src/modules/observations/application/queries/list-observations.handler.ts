import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  OBSERVATION_REPOSITORY_PORT,
  ObservationRepositoryPort,
} from '../../domain/ports/observation.repository.port';
import { ABSENCE_REPOSITORY_PORT } from '../../../absences/domain/ports/absence.repository.port';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { ObservationMapper } from '../../infrastructure/observation.mapper';
import type { ObservationResponseDto } from '../dtos/observation-response.dto';
import { ListObservationsQuery } from './list-observations.query';

/**
 * Query handler for listing observations of an absence.
 *
 * Implements:
 * - RF-35: Observation section on absences
 * - RF-36: Only involved users (creator + validators) can view observations
 */
@Injectable()
@QueryHandler(ListObservationsQuery)
export class ListObservationsHandler implements IQueryHandler<
  ListObservationsQuery,
  ObservationResponseDto[]
> {
  constructor(
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort,
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly mapper: ObservationMapper
  ) {}

  async execute(query: ListObservationsQuery): Promise<ObservationResponseDto[]> {
    // Verify absence exists
    const absence = await this.absenceRepository.findById(query.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${query.absenceId} not found`);
    }

    // RF-36: Verify user is involved (creator or assigned validator)
    const isCreator = absence.userId === query.userId;
    const assignedValidators = await this.absenceRepository.getAssignedValidators(query.absenceId);
    const isValidator = assignedValidators.includes(query.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException('Only involved users can view observations on this absence');
    }

    // Retrieve and map observations
    const observations = await this.observationRepository.findByAbsenceId(query.absenceId);

    return observations.map((observation) => this.mapper.toResponseDto(observation));
  }
}
