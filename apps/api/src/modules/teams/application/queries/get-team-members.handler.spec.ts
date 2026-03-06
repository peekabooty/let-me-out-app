import { NotFoundException } from '@nestjs/common';

import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { Team } from '../../domain/team.entity';
import { GetTeamMembersQuery } from './get-team-members.query';
import { GetTeamMembersHandler } from './get-team-members.handler';

const NOW = new Date('2025-06-01T00:00:00.000Z');
const JOINED = new Date('2025-06-10T09:00:00.000Z');

const makeTeam = (): Team =>
  new Team({
    id: 'team-1',
    name: 'Engineering',
    color: '#AABBCC',
    createdAt: NOW,
    updatedAt: NOW,
  });

const makeRepo = (overrides: Partial<TeamRepositoryPort> = {}): TeamRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(makeTeam()),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn(),
  delete: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn(),
  findMembers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('GetTeamMembersHandler', () => {
  it('returns an empty array when the team has no members', async () => {
    const repo = makeRepo({ findMembers: jest.fn().mockResolvedValue([]) });
    const handler = new GetTeamMembersHandler(repo);
    const query = new GetTeamMembersQuery('team-1', 'requester-1');

    const result = await handler.execute(query);

    expect(repo.findById).toHaveBeenCalledWith('team-1');
    expect(repo.findMembers).toHaveBeenCalledWith('team-1');
    expect(result).toEqual([]);
  });

  it('maps members to DTOs with ISO joined date', async () => {
    const repo = makeRepo({
      findMembers: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          userName: 'Alice',
          userEmail: 'alice@example.com',
          joinedAt: JOINED,
        },
      ]),
    });
    const handler = new GetTeamMembersHandler(repo);

    const result = await handler.execute(new GetTeamMembersQuery('team-1', 'requester-1'));

    expect(result).toEqual([
      {
        userId: 'user-1',
        userName: 'Alice',
        userEmail: 'alice@example.com',
        joinedAt: JOINED.toISOString(),
      },
    ]);
  });

  it('throws NotFoundException when the team does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new GetTeamMembersHandler(repo);

    await expect(
      handler.execute(new GetTeamMembersQuery('nonexistent-team', 'requester-1'))
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repo.findMembers).not.toHaveBeenCalled();
  });

  it('returns multiple members ordered as provided by the repository', async () => {
    const repo = makeRepo({
      findMembers: jest.fn().mockResolvedValue([
        { userId: 'user-1', userName: 'Alice', userEmail: 'a@x.com', joinedAt: JOINED },
        { userId: 'user-2', userName: 'Bob', userEmail: 'b@x.com', joinedAt: JOINED },
      ]),
    });
    const handler = new GetTeamMembersHandler(repo);

    const result = await handler.execute(new GetTeamMembersQuery('team-1', 'requester-1'));

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user-1');
    expect(result[1].userId).toBe('user-2');
  });
});
