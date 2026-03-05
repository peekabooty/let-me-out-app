import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AddTeamMemberHandler } from './application/commands/add-team-member.handler';
import { CreateTeamHandler } from './application/commands/create-team.handler';
import { RemoveTeamMemberHandler } from './application/commands/remove-team-member.handler';
import { ListTeamsHandler } from './application/queries/list-teams.handler';
import { GetTeamMembersHandler } from './application/queries/get-team-members.handler';
import { TEAM_REPOSITORY_PORT } from './domain/ports/team.repository.port';
import { TeamMapper } from './infrastructure/team.mapper';
import { TeamPrismaRepository } from './infrastructure/team.prisma.repository';
import { TeamsController } from './infrastructure/teams.controller';

const commandHandlers = [CreateTeamHandler, AddTeamMemberHandler, RemoveTeamMemberHandler];
const queryHandlers = [ListTeamsHandler, GetTeamMembersHandler];

@Module({
  imports: [CqrsModule, PrismaModule, UsersModule],
  controllers: [TeamsController],
  providers: [
    ClockService,
    TeamMapper,
    {
      provide: TEAM_REPOSITORY_PORT,
      useClass: TeamPrismaRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class TeamsModule {}
