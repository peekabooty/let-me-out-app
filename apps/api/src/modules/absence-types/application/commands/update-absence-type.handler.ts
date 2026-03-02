import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ClockService } from '../../../../common';
import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../domain/ports/absence-type.repository.port';
import { UpdateAbsenceTypeCommand } from './update-absence-type.command';

@Injectable()
@CommandHandler(UpdateAbsenceTypeCommand)
export class UpdateAbsenceTypeHandler implements ICommandHandler<UpdateAbsenceTypeCommand, void> {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly repository: AbsenceTypeRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: UpdateAbsenceTypeCommand): Promise<void> {
    const absenceType = await this.repository.findById(command.id);

    if (!absenceType) {
      throw new NotFoundException(`Absence type with id ${command.id} not found`);
    }

    const now = this.clock.now();
    let updated = absenceType;

    if (command.name !== undefined) {
      updated = updated.rename(command.name, now);
    }

    const config: {
      maxPerYear?: number;
      minDuration?: number;
      maxDuration?: number;
      requiresValidation?: boolean;
      allowPastDates?: boolean;
      minDaysInAdvance?: number | null;
    } = {};

    if (command.maxPerYear !== undefined) {
      config.maxPerYear = command.maxPerYear;
    }
    if (command.minDuration !== undefined) {
      config.minDuration = command.minDuration;
    }
    if (command.maxDuration !== undefined) {
      config.maxDuration = command.maxDuration;
    }
    if (command.requiresValidation !== undefined) {
      config.requiresValidation = command.requiresValidation;
    }
    if (command.allowPastDates !== undefined) {
      config.allowPastDates = command.allowPastDates;
    }
    if (command.minDaysInAdvance !== undefined) {
      config.minDaysInAdvance = command.minDaysInAdvance;
    }

    if (Object.keys(config).length > 0) {
      updated = updated.updateConfig(config, now);
    }

    const finalMinDuration = config.minDuration ?? updated.minDuration;
    const finalMaxDuration = config.maxDuration ?? updated.maxDuration;

    if (finalMinDuration > finalMaxDuration) {
      throw new BadRequestException('minDuration cannot be greater than maxDuration');
    }

    await this.repository.update(updated);
  }
}
