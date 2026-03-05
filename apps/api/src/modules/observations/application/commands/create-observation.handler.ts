import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ClockService, generateId } from '../../../../common';
import { Observation } from '../../domain/observation.entity';
import {
  OBSERVATION_REPOSITORY_PORT,
  ObservationRepositoryPort,
} from '../../domain/ports/observation.repository.port';
import { ABSENCE_REPOSITORY_PORT } from '../../../absences/domain/ports/absence.repository.port';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { CreateObservationCommand } from './create-observation.command';

/**
 * Command handler for creating a new observation on an absence.
 *
 * Implements:
 * - RF-35: Observation section on absences
 * - RF-36: Only involved users (creator + validators) can create observations
 * - RF-37: Observations can be used to explain approvals/rejections
 */
@Injectable()
@CommandHandler(CreateObservationCommand)
export class CreateObservationHandler implements ICommandHandler<CreateObservationCommand, string> {
  constructor(
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort,
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: CreateObservationCommand): Promise<string> {
    const now = this.clock.now();

    // Verify absence exists
    const absence = await this.absenceRepository.findById(command.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${command.absenceId} not found`);
    }

    // RF-36: Verify user is involved (creator or assigned validator)
    const isCreator = absence.userId === command.userId;
    const assignedValidators = await this.absenceRepository.getAssignedValidators(
      command.absenceId
    );
    const isValidator = assignedValidators.includes(command.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException('Only involved users can create observations on this absence');
    }

    // Create observation
    const observationId = generateId();
    const observation = new Observation({
      id: observationId,
      absenceId: command.absenceId,
      userId: command.userId,
      content: command.content,
      createdAt: now,
    });

    await this.observationRepository.save(observation);

    return observationId;
  }
}
