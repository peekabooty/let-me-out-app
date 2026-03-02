import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ClockService } from '../../../../common';
import {
  ABSENCE_TYPE_REPOSITORY_PORT,
  AbsenceTypeRepositoryPort,
} from '../../domain/ports/absence-type.repository.port';
import { DeactivateAbsenceTypeCommand } from './deactivate-absence-type.command';

@Injectable()
@CommandHandler(DeactivateAbsenceTypeCommand)
export class DeactivateAbsenceTypeHandler implements ICommandHandler<
  DeactivateAbsenceTypeCommand,
  void
> {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY_PORT)
    private readonly repository: AbsenceTypeRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: DeactivateAbsenceTypeCommand): Promise<void> {
    const absenceType = await this.repository.findById(command.id);

    if (!absenceType) {
      throw new NotFoundException(`Absence type with id ${command.id} not found`);
    }

    const deactivated = absenceType.deactivate(this.clock.now());

    await this.repository.update(deactivated);
  }
}
