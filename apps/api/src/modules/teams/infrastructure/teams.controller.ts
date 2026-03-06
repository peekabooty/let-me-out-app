import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { UserRole } from '@repo/types';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common';
import { AddTeamMemberCommand } from '../application/commands/add-team-member.command';
import { CreateTeamCommand } from '../application/commands/create-team.command';
import { DeleteTeamCommand } from '../application/commands/delete-team.command';
import { RemoveTeamMemberCommand } from '../application/commands/remove-team-member.command';
import { CreateTeamDto } from '../application/dtos/create-team.dto';
import type { TeamResponseDto } from '../application/dtos/team-response.dto';
import { UpdateTeamMembershipDto } from '../application/dtos/update-team-membership.dto';
import { ListTeamsQuery } from '../application/queries/list-teams.query';
import { GetTeamMembersQuery } from '../application/queries/get-team-members.query';
import type { TeamMemberDto } from '../application/queries/get-team-members.handler';

@UseGuards(JwtAuthGuard)
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

  /**
   * Gets all members of a team.
   *
   * GET /teams/:teamId/members
   *
   * RF-73: Auditor can view team members.
   * RF-66: Admin and Validator can manage and view team members.
   */
  @Get(':teamId/members')
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR, UserRole.AUDITOR)
  async getMembers(
    @Param('teamId') teamId: string,
    @Req() request: Request
  ): Promise<TeamMemberDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<GetTeamMembersQuery, TeamMemberDto[]>(
      new GetTeamMembersQuery(teamId, user.userId)
    );
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

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.VALIDATOR)
  async deleteTeam(@Param('teamId') teamId: string): Promise<void> {
    await this.commandBus.execute<DeleteTeamCommand, void>(new DeleteTeamCommand(teamId));
  }
}
