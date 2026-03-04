import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@repo/types';

import { Roles } from '../../../common';
import { AddTeamMemberCommand } from '../application/commands/add-team-member.command';
import { CreateTeamCommand } from '../application/commands/create-team.command';
import { RemoveTeamMemberCommand } from '../application/commands/remove-team-member.command';
import { CreateTeamDto } from '../application/dtos/create-team.dto';
import type { TeamResponseDto } from '../application/dtos/team-response.dto';
import { UpdateTeamMembershipDto } from '../application/dtos/update-team-membership.dto';
import { ListTeamsQuery } from '../application/queries/list-teams.query';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR)
  async create(@Body() dto: CreateTeamDto): Promise<{ id: string }> {
    const id = await this.commandBus.execute<CreateTeamCommand, string>(
      new CreateTeamCommand(dto.name, dto.color)
    );
    return { id };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR, UserRole.AUDITOR)
  async findAll(): Promise<TeamResponseDto[]> {
    return this.queryBus.execute<ListTeamsQuery, TeamResponseDto[]>(new ListTeamsQuery());
  }

  @Post(':teamId/members')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR)
  async addMember(
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamMembershipDto
  ): Promise<void> {
    await this.commandBus.execute<AddTeamMemberCommand, void>(
      new AddTeamMemberCommand(teamId, dto.userId)
    );
  }

  @Delete(':teamId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR)
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string
  ): Promise<void> {
    await this.commandBus.execute<RemoveTeamMemberCommand, void>(
      new RemoveTeamMemberCommand(teamId, userId)
    );
  }
}
