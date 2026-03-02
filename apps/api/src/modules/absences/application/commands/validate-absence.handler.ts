import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AbsenceStatus, ValidationDecision } from '@repo/types';

import { ClockService } from '../../../../common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import { AbsenceStateMachineService } from '../../domain/services/absence-state-machine.service';
import { ValidateAbsenceCommand } from './validate-absence.command';

/**
 * Command handler for validating (accepting or rejecting) an absence.
 *
 * Implements:
 * - RF-33: Validators act in parallel; each can accept or reject individually
 * - RF-34: Validator cannot validate their own absence
 * - RF-30: From WAITING_VALIDATION, transitions based on validator decisions
 * - RF-53: Records status changes in absence_status_history
 * - RF-77: Records validation decisions in absence_validation_history
 */
@Injectable()
@CommandHandler(ValidateAbsenceCommand)
export class ValidateAbsenceHandler implements ICommandHandler<ValidateAbsenceCommand, void> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly stateMachine: AbsenceStateMachineService,
    private readonly clock: ClockService,
    private readonly prisma: PrismaService
  ) {}

  async execute(command: ValidateAbsenceCommand): Promise<void> {
    const now = this.clock.now();

    // Use a transaction to ensure atomicity of all operations
    await this.prisma.$transaction(async () => {
      // Find the absence
      const absence = await this.absenceRepository.findById(command.absenceId);
      if (!absence) {
        throw new NotFoundException(`Absence with ID ${command.absenceId} not found`);
      }

      // RF-34: Validator cannot validate their own absence
      if (absence.userId === command.validatorId) {
        throw new ForbiddenException('A validator cannot validate their own absence');
      }

      // Verify absence is in WAITING_VALIDATION state
      if (absence.status !== AbsenceStatus.WAITING_VALIDATION) {
        throw new BadRequestException(
          `Absence is in ${absence.status} state and cannot be validated`
        );
      }

      // Verify the validator is assigned to this absence
      const assignedValidators = await this.absenceRepository.getAssignedValidators(
        command.absenceId
      );
      if (!assignedValidators.includes(command.validatorId)) {
        throw new ForbiddenException('You are not assigned as a validator for this absence');
      }

      // RF-77: Record the validation decision in history
      await this.absenceRepository.createValidationHistory(
        command.absenceId,
        command.validatorId,
        command.decision,
        now
      );

      // Get all validation decisions (including the one just recorded)
      const validationHistory = await this.absenceRepository.getValidationHistory(
        command.absenceId
      );

      // Determine the latest decision for each validator
      const validatorDecisions = new Map<string, ValidationDecision>();
      for (const record of validationHistory) {
        if (!validatorDecisions.has(record.validatorId)) {
          validatorDecisions.set(record.validatorId, record.decision);
        }
      }

      // RF-30: Determine status transition based on all validators' decisions
      // Check if all assigned validators have made a decision
      const allValidatorsDecided = assignedValidators.every((validatorId) =>
        validatorDecisions.has(validatorId)
      );

      if (allValidatorsDecided) {
        const decisions = [...validatorDecisions.values()];
        const hasRejection = decisions.includes(ValidationDecision.REJECTED);

        // RF-30: If at least one validator rejects → RECONSIDER, else → ACCEPTED
        const newStatus = hasRejection ? AbsenceStatus.RECONSIDER : AbsenceStatus.ACCEPTED;

        // Validate the transition is allowed
        this.stateMachine.validateTransition(absence.status, newStatus);

        // Update the absence status
        const updatedAbsence = absence.updateStatus(newStatus, now);
        await this.absenceRepository.update(updatedAbsence);

        // RF-53 & RF-76: Record the status change in history
        await this.absenceRepository.createStatusHistory(
          absence.id,
          absence.status,
          newStatus,
          command.validatorId, // The validator who triggered the final decision
          now
        );
      }
    });
  }
}
