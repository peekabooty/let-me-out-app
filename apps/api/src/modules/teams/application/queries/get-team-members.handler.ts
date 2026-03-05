import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from '../../domain/ports/team.repository.port';
import { GetTeamMembersQuery } from './get-team-members.query';

export interface TeamMemberDto {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
}

/**
 * Query handler for listing the members of a team.
 *
 * RF-73: Auditor users can view the list of existing teams and their members.
 */
@Injectable()
@QueryHandler(GetTeamMembersQuery)
export class GetTeamMembersHandler implements IQueryHandler<GetTeamMembersQuery, TeamMemberDto[]> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort
  ) {}

  /**
   * Returns all members of the given team.
   *
   * @param {GetTeamMembersQuery} query - Query containing teamId and requesterId
   * @returns {Promise<TeamMemberDto[]>}
   * @throws {NotFoundException} If the team does not exist
   */
  async execute(query: GetTeamMembersQuery): Promise<TeamMemberDto[]> {
    const team = await this.teamRepository.findById(query.teamId);

    if (!team) {
      throw new NotFoundException(`Team with id ${query.teamId} not found`);
    }

    const members = await this.teamRepository.findMembers(query.teamId);

    return members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      userEmail: m.userEmail,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }
}
