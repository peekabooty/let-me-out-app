import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AbsenceStatus } from '@repo/types';

import { ClockService } from '../../../../common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { AbsenceStateMachineService } from '../../domain/services/absence-state-machine.service';
import { DiscardAbsenceCommand } from './discard-absence.command';
import { AbsenceStatusChangedEvent } from '../../domain/events/absence-status-changed.event';

/**
 * Command handler for discarding an absence from RECONSIDER state.
 *
 * Implements:
 * - RF-31: From RECONSIDER, user can decide not to continue → DISCARDED
 * - RF-32: DISCARDED is a final state
 * - RF-53: Records status change in absence_status_history
 */
@Injectable()
@CommandHandler(DiscardAbsenceCommand)
export class DiscardAbsenceHandler implements ICommandHandler<DiscardAbsenceCommand, void> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly stateMachine: AbsenceStateMachineService,
    private readonly clock: ClockService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: DiscardAbsenceCommand): Promise<void> {
    const now = this.clock.now();

    await this.prisma.$transaction(async () => {
      const absence = await this.absenceRepository.findById(command.absenceId);
      if (!absence) {
        throw new NotFoundException(`Absence with ID ${command.absenceId} not found`);
      }

      // Only the absence creator can discard
      if (absence.userId !== command.userId) {
        throw new ForbiddenException('Only the absence creator can discard it');
      }

      // Must be in RECONSIDER state
      if (absence.status !== AbsenceStatus.RECONSIDER) {
        throw new BadRequestException(
          `Only absences in RECONSIDER state can be discarded. Current status: ${absence.status}`
        );
      }

      this.stateMachine.validateTransition(absence.status, AbsenceStatus.DISCARDED);

      const updatedAbsence = absence.updateStatus(AbsenceStatus.DISCARDED, now);
      await this.absenceRepository.update(updatedAbsence);

      await this.absenceRepository.createStatusHistory(
        absence.id,
        absence.status,
        AbsenceStatus.DISCARDED,
        command.userId,
        now
      );

      const event = new AbsenceStatusChangedEvent(
        absence.id,
        absence.userId,
        absence.status,
        AbsenceStatus.DISCARDED,
        command.userId,
        now
      );
      this.eventBus.publish(event);
    });
  }
}
