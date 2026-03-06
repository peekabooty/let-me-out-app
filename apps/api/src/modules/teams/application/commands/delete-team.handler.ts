import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from '../../domain/ports/team.repository.port';
import { DeleteTeamCommand } from './delete-team.command';

@Injectable()
@CommandHandler(DeleteTeamCommand)
export class DeleteTeamHandler implements ICommandHandler<DeleteTeamCommand, void> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort
  ) {}

  async execute(command: DeleteTeamCommand): Promise<void> {
    const team = await this.teamRepository.findById(command.teamId);

    if (!team) {
      throw new NotFoundException(`Team with id ${command.teamId} not found`);
    }

    await this.teamRepository.delete(command.teamId);
  }
}
