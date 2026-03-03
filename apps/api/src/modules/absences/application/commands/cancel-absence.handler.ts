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
import { CancelAbsenceCommand } from './cancel-absence.command';
import { AbsenceStatusChangedEvent } from '../../domain/events/absence-status-changed.event';

/**
 * Command handler for cancelling an accepted absence before its start date.
 *
 * Implements:
 * - RF-51: Creator can cancel an accepted absence before the start date
 * - RF-52: CANCELLED is a final state; no further transitions allowed
 * - RF-53: Records status change in absence_status_history
 */
@Injectable()
@CommandHandler(CancelAbsenceCommand)
export class CancelAbsenceHandler implements ICommandHandler<CancelAbsenceCommand, void> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly stateMachine: AbsenceStateMachineService,
    private readonly clock: ClockService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CancelAbsenceCommand): Promise<void> {
    const now = this.clock.now();

    // Use a transaction to ensure atomicity of all operations
    await this.prisma.$transaction(async () => {
      // Find the absence
      const absence = await this.absenceRepository.findById(command.absenceId);
      if (!absence) {
        throw new NotFoundException(`Absence with ID ${command.absenceId} not found`);
      }

      // RF-51: Only the creator can cancel their absence
      if (absence.userId !== command.userId) {
        throw new ForbiddenException('Only the absence creator can cancel it');
      }

      // RF-51: Absence must be in ACCEPTED state to be cancelled
      if (absence.status !== AbsenceStatus.ACCEPTED) {
        throw new BadRequestException(
          `Only accepted absences can be cancelled. Current status: ${absence.status}`
        );
      }

      // RF-51: Cannot cancel if the absence has already started
      if (absence.startAt <= now) {
        throw new BadRequestException('Cannot cancel an absence that has already started');
      }

      // Validate the transition is allowed by the state machine
      this.stateMachine.validateTransition(absence.status, AbsenceStatus.CANCELLED);

      // Update the absence status to CANCELLED
      const updatedAbsence = absence.updateStatus(AbsenceStatus.CANCELLED, now);
      await this.absenceRepository.update(updatedAbsence);

      // RF-53: Record the status change in history
      await this.absenceRepository.createStatusHistory(
        absence.id,
        absence.status,
        AbsenceStatus.CANCELLED,
        command.userId,
        now
      );

      // Publish domain event for notifications (RF-48, RF-49)
      const event = new AbsenceStatusChangedEvent(
        absence.id,
        absence.userId,
        absence.status,
        AbsenceStatus.CANCELLED,
        command.userId,
        now
      );
      this.eventBus.publish(event);
    });
  }
}
