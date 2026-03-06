import { NotFoundException } from '@nestjs/common';

import { Team } from '../../domain/team.entity';
import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { DeleteTeamCommand } from './delete-team.command';
import { DeleteTeamHandler } from './delete-team.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeTeamRepo = (overrides: Partial<TeamRepositoryPort> = {}): TeamRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(
    new Team({
      id: '01900000-0000-7000-8000-000000000001',
      name: 'Engineering',
      color: '#123456',
      createdAt: NOW,
      updatedAt: NOW,
    })
  ),
  findAll: jest.fn(),
  save: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn(),
  findMembers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('DeleteTeamHandler', () => {
  it('deletes team when it exists', async () => {
    const teamRepository = makeTeamRepo();
    const handler = new DeleteTeamHandler(teamRepository);

    await handler.execute(new DeleteTeamCommand('01900000-0000-7000-8000-000000000001'));

    expect(teamRepository.delete).toHaveBeenCalledWith('01900000-0000-7000-8000-000000000001');
  });

  it('throws NotFoundException when team does not exist', async () => {
    const teamRepository = makeTeamRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new DeleteTeamHandler(teamRepository);

    await expect(handler.execute(new DeleteTeamCommand('missing-team-id'))).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
