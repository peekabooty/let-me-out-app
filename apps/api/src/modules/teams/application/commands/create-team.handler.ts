import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ClockService, generateId } from '../../../../common';
import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { TEAM_REPOSITORY_PORT } from '../../domain/ports/team.repository.port';
import { Team } from '../../domain/team.entity';
import { CreateTeamCommand } from './create-team.command';

@Injectable()
@CommandHandler(CreateTeamCommand)
export class CreateTeamHandler implements ICommandHandler<CreateTeamCommand, string> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: CreateTeamCommand): Promise<string> {
    const now = this.clock.now();

    const team = new Team({
      id: generateId(),
      name: command.name,
      color: command.color,
      createdAt: now,
      updatedAt: now,
    });

    await this.teamRepository.save(team);

    return team.id;
  }
}
