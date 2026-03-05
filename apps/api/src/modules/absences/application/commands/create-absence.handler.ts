import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
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
import { AbsenceCreatedEvent } from '../../domain/events/absence-created.event';

/**
 * Command handler for creating a new absence request.
 *
 * Implements RF-23 to RF-27, RF-34, RF-50, RF-11, RF-15, RF-19, RF-20:
 * - RF-23: Validates required fields (type, start, end, validators for validation types)
 * - RF-24: Validates duration within allowed limits
 * - RF-25: Validates annual limit not exceeded
 * - RF-26: Absences without validation flow are registered directly
 * - RF-27: Absences with validation flow start in WAITING_VALIDATION status
 * - RF-34: Prevents the absence owner from self-assigning as validator
 * - RF-50: Prevents overlapping absences for the same user
 * - RF-11: Unpaid planned absence only allows future dates
 * - RF-15: Unpaid unplanned absence allows past and future dates
 * - RF-19: Paid absence only allows future dates
 * - RF-20: Paid absence requires minimum 15 calendar days in advance
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
    private readonly clock: ClockService,
    private readonly eventBus: EventBus
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

    // RF-11, RF-19: Types that do not allow past dates must start in the future
    if (!absenceType.allowPastDates && command.startAt < now) {
      throw new BadRequestException(
        'This absence type does not allow past dates. Start date must be in the future'
      );
    }

    // RF-20: Validate minimum days in advance when required
    const minDaysInAdvance = absenceType.getMinDaysInAdvance();
    if (minDaysInAdvance !== null) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysInAdvance = Math.floor((command.startAt.getTime() - now.getTime()) / msPerDay);
      if (daysInAdvance < minDaysInAdvance) {
        throw new BadRequestException(
          `This absence type requires at least ${minDaysInAdvance} calendar days in advance. ` +
            `Start date is only ${daysInAdvance} day(s) away`
        );
      }
    }

    // RF-34: Prevent self-assignment as validator before any DB writes
    if (absenceType.requiresValidation && command.validatorIds.includes(command.userId)) {
      throw new BadRequestException(
        'A user cannot be assigned as a validator for their own absence'
      );
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

    // RF-23, RF-33: Persist assigned validators (for absences requiring validation)
    if (absenceType.requiresValidation && command.validatorIds.length > 0) {
      await this.absenceRepository.assignValidators(absence.id, command.validatorIds, now);
    }

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

    // Publish domain event for notifications (RF-47, RF-49)
    if (absenceType.requiresValidation && command.validatorIds.length > 0) {
      const event = new AbsenceCreatedEvent(
        absence.id,
        absence.userId,
        absence.absenceTypeId,
        absence.startAt,
        absence.endAt,
        absence.duration,
        absence.status,
        command.validatorIds
      );
      this.eventBus.publish(event);
    }

    return absence.id;
  }
}
