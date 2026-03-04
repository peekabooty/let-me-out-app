import { Injectable } from '@nestjs/common';

import type { TeamResponseDto } from '../application/dtos/team-response.dto';
import { Team } from '../domain/team.entity';

interface PrismaTeamRecord {
  id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class TeamMapper {
  toDomain(prismaTeam: PrismaTeamRecord): Team {
    return new Team({
      id: prismaTeam.id,
      name: prismaTeam.name,
      color: prismaTeam.color,
      createdAt: prismaTeam.created_at,
      updatedAt: prismaTeam.updated_at,
    });
  }

  toResponseDto(team: Team): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      color: team.color,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }
}
