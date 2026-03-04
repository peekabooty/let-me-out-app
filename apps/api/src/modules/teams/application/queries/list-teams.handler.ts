import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from '../../domain/ports/team.repository.port';
import { TeamMapper } from '../../infrastructure/team.mapper';
import type { TeamResponseDto } from '../dtos/team-response.dto';
import { ListTeamsQuery } from './list-teams.query';

@Injectable()
@QueryHandler(ListTeamsQuery)
export class ListTeamsHandler implements IQueryHandler<ListTeamsQuery, TeamResponseDto[]> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT)
    private readonly teamRepository: TeamRepositoryPort,
    private readonly teamMapper: TeamMapper
  ) {}

  async execute(): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.findAll();
    return teams.map((team) => this.teamMapper.toResponseDto(team));
  }
}
