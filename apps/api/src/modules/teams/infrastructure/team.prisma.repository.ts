import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { TeamRepositoryPort } from '../domain/ports/team.repository.port';
import type { Team } from '../domain/team.entity';
import { TeamMapper } from './team.mapper';

@Injectable()
export class TeamPrismaRepository implements TeamRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: TeamMapper
  ) {}

  async findById(id: string): Promise<Team | null> {
    const record = await this.prisma.team.findUnique({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findAll(): Promise<Team[]> {
    const records = await this.prisma.team.findMany({ orderBy: { created_at: 'asc' } });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async save(team: Team): Promise<void> {
    await this.prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        color: team.color,
        created_at: team.createdAt,
        updated_at: team.updatedAt,
      },
    });
  }

  async addMember(teamId: string, userId: string, joinedAt: Date): Promise<void> {
    await this.prisma.team_member.create({
      data: {
        team_id: teamId,
        user_id: userId,
        joined_at: joinedAt,
      },
    });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.team_member.delete({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
    });
  }

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const record = await this.prisma.team_member.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
      select: {
        user_id: true,
      },
    });

    return !!record;
  }
}
