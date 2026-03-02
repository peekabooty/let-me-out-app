import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AbsenceStatus } from '@repo/types';

import { ClockService, generateId } from '../../../../common';
import { Absence } from '../../domain/absence.entity';
import {
  ABSENCE_REPOSITORY_PORT,
  AbsenceRepositoryPort,
} from '../../domain/ports/absence.repository.port';
import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../../absence-types/domain/ports/absence-type.repository.port';
import { DurationCalculatorService } from '../../domain/services/duration-calculator.service';
import { AnnualLimitValidatorService } from '../../domain/services/annual-limit-validator.service';
import { OverlapValidatorService } from '../../domain/services/overlap-validator.service';
import { CreateAbsenceCommand } from './create-absence.command';

/**
 * Command handler for creating a new absence request.
 *
 * Implements RF-23 to RF-27 and RF-50:
 * - RF-23: Validates required fields (type, start, end)
 * - RF-24: Validates duration within allowed limits
 * - RF-25: Validates annual limit not exceeded
 * - RF-26: Absences without validation flow are registered directly
 * - RF-27: Absences with validation flow start in WAITING_VALIDATION status
 * - RF-50: Prevents overlapping absences for the same user
 */
@Injectable()
@CommandHandler(CreateAbsenceCommand)
export class CreateAbsenceHandler implements ICommandHandler<CreateAbsenceCommand, string> {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly absenceTypeRepository: AbsenceTypeRepositoryPort,
    private readonly durationCalculator: DurationCalculatorService,
    private readonly annualLimitValidator: AnnualLimitValidatorService,
    private readonly overlapValidator: OverlapValidatorService,
    private readonly clock: ClockService
  ) {}

  async execute(command: CreateAbsenceCommand): Promise<string> {
    const now = this.clock.now();

    // RF-23: Validate absence type exists and is active
    const absenceType = await this.absenceTypeRepository.findById(command.absenceTypeId);
    if (!absenceType) {
      throw new NotFoundException(`Absence type with ID ${command.absenceTypeId} not found`);
    }
    if (!absenceType.isActive) {
      throw new BadRequestException('The selected absence type is not active');
    }

    // Validate date range
    if (command.endAt <= command.startAt) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate duration based on the absence type's unit
    const duration = this.durationCalculator.calculateDuration(
      command.startAt,
      command.endAt,
      absenceType.unit
    );

    // RF-24: Validate duration within allowed limits for this absence type
    if (!absenceType.isDurationValid(duration)) {
      throw new BadRequestException(
        `Duration must be between ${absenceType.minDuration} and ${absenceType.maxDuration} ${absenceType.unit}`
      );
    }

    // RF-25: Validate annual limit not exceeded
    const year = command.startAt.getFullYear();
    await this.annualLimitValidator.validateLimit(
      command.userId,
      absenceType.id,
      duration,
      absenceType.unit,
      year,
      absenceType.maxPerYear
    );

    // RF-50: Validate no overlapping absences
    await this.overlapValidator.validate(command.userId, command.startAt, command.endAt);

    // Determine initial status based on validation requirement
    // RF-26: Absences without validation flow are registered directly (null status)
    // RF-27: Absences with validation flow start in WAITING_VALIDATION status
    const initialStatus = absenceType.requiresValidation ? AbsenceStatus.WAITING_VALIDATION : null;

    // Create the absence entity
    const absence = new Absence({
      id: generateId(),
      userId: command.userId,
      absenceTypeId: absenceType.id,
      startAt: command.startAt,
      endAt: command.endAt,
      duration,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
    });

    // Save the absence
    await this.absenceRepository.save(absence);

    // Create status history record if this absence requires validation (RF-27)
    if (initialStatus !== null) {
      await this.absenceRepository.createStatusHistory(
        absence.id,
        null, // fromStatus is null for new absences
        initialStatus,
        command.userId, // The user who created it
        now
      );
    }

    return absence.id;
  }
}
