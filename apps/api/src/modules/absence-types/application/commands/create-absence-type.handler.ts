import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ClockService, generateId } from '../../../../common';
import { AbsenceType } from '../../domain/absence-type.entity';
import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../domain/ports/absence-type.repository.port';
import { CreateAbsenceTypeCommand } from './create-absence-type.command';

@Injectable()
@CommandHandler(CreateAbsenceTypeCommand)
export class CreateAbsenceTypeHandler implements ICommandHandler<CreateAbsenceTypeCommand, string> {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly repository: AbsenceTypeRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: CreateAbsenceTypeCommand): Promise<string> {
    if (command.minDuration > command.maxDuration) {
      throw new BadRequestException('minDuration cannot be greater than maxDuration');
    }

    const now = this.clock.now();

    const absenceType = new AbsenceType({
      id: generateId(),
      name: command.name,
      unit: command.unit,
      maxPerYear: command.maxPerYear,
      minDuration: command.minDuration,
      maxDuration: command.maxDuration,
      requiresValidation: command.requiresValidation,
      allowPastDates: command.allowPastDates,
      minDaysInAdvance: command.minDaysInAdvance,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(absenceType);

    return absenceType.id;
  }
}
