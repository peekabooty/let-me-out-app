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
import { ReconsiderAbsenceCommand } from './reconsider-absence.command';
import { AbsenceStatusChangedEvent } from '../../domain/events/absence-status-changed.event';

/**
 * Command handler for resending an absence for validation from RECONSIDER state.
 *
 * Implements:
 * - RF-31: From RECONSIDER, user can resend for validation → WAITING_VALIDATION
 * - RF-53: Records status change in absence_status_history
 */
@Injectable()
@CommandHandler(ReconsiderAbsenceCommand)
export class ReconsiderAbsenceHandler implements ICommandHandler<ReconsiderAbsenceCommand, void> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly stateMachine: AbsenceStateMachineService,
    private readonly clock: ClockService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: ReconsiderAbsenceCommand): Promise<void> {
    const now = this.clock.now();

    await this.prisma.$transaction(async () => {
      const absence = await this.absenceRepository.findById(command.absenceId);
      if (!absence) {
        throw new NotFoundException(`Absence with ID ${command.absenceId} not found`);
      }

      // Only the absence creator can reconsider
      if (absence.userId !== command.userId) {
        throw new ForbiddenException('Only the absence creator can reconsider it');
      }

      // Must be in RECONSIDER state
      if (absence.status !== AbsenceStatus.RECONSIDER) {
        throw new BadRequestException(
          `Only absences in RECONSIDER state can be resubmitted. Current status: ${absence.status}`
        );
      }

      this.stateMachine.validateTransition(absence.status, AbsenceStatus.WAITING_VALIDATION);

      const updatedAbsence = absence.updateStatus(AbsenceStatus.WAITING_VALIDATION, now);
      await this.absenceRepository.update(updatedAbsence);

      await this.absenceRepository.createStatusHistory(
        absence.id,
        absence.status,
        AbsenceStatus.WAITING_VALIDATION,
        command.userId,
        now
      );

      const event = new AbsenceStatusChangedEvent(
        absence.id,
        absence.userId,
        absence.status,
        AbsenceStatus.WAITING_VALIDATION,
        command.userId,
        now
      );
      this.eventBus.publish(event);
    });
  }
}
