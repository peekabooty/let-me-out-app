import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from '../../domain/ports/team.repository.port';
import { RemoveTeamMemberCommand } from './remove-team-member.command';

@Injectable()
@CommandHandler(RemoveTeamMemberCommand)
export class RemoveTeamMemberHandler implements ICommandHandler<RemoveTeamMemberCommand, void> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort
  ) {}

  async execute(command: RemoveTeamMemberCommand): Promise<void> {
    const [team, isMember] = await Promise.all([
      this.teamRepository.findById(command.teamId),
      this.teamRepository.isMember(command.teamId, command.userId),
    ]);

    if (!team) {
      throw new NotFoundException(`Team with id ${command.teamId} not found`);
    }

    if (!isMember) {
      throw new NotFoundException('Team membership not found');
    }

    await this.teamRepository.removeMember(command.teamId, command.userId);
  }
}
