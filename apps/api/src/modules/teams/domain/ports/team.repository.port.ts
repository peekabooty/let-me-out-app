import type { Team } from '../team.entity';

export const TEAM_REPOSITORY_PORT = Symbol('TEAM_REPOSITORY_PORT');

export interface TeamMemberRecord {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

export interface TeamRepositoryPort {
  findById(id: string): Promise<Team | null>;
  findAll(): Promise<Team[]>;
  save(team: Team): Promise<void>;
  addMember(teamId: string, userId: string, joinedAt: Date): Promise<void>;
  removeMember(teamId: string, userId: string): Promise<void>;
  isMember(teamId: string, userId: string): Promise<boolean>;
  findMembers(teamId: string): Promise<TeamMemberRecord[]>;
}
