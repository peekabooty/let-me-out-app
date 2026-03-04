import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ClockService } from '../../../../common';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../users/domain/ports/user.repository.port';
import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from '../../domain/ports/team.repository.port';
import { AddTeamMemberCommand } from './add-team-member.command';

@Injectable()
@CommandHandler(AddTeamMemberCommand)
export class AddTeamMemberHandler implements ICommandHandler<AddTeamMemberCommand, void> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: AddTeamMemberCommand): Promise<void> {
    const [team, user] = await Promise.all([
      this.teamRepository.findById(command.teamId),
      this.userRepository.findById(command.userId),
    ]);

    if (!team) {
      throw new NotFoundException(`Team with id ${command.teamId} not found`);
    }

    if (!user || !user.isActive) {
      throw new NotFoundException(`User with id ${command.userId} not found`);
    }

    if (user.role === UserRole.AUDITOR) {
      throw new BadRequestException('Auditor users cannot be assigned to teams');
    }

    const alreadyMember = await this.teamRepository.isMember(command.teamId, command.userId);
    if (alreadyMember) {
      throw new ConflictException('User is already a member of this team');
    }

    await this.teamRepository.addMember(command.teamId, command.userId, this.clock.now());
  }
}
