import { NotFoundException } from '@nestjs/common';

import { Team } from '../../domain/team.entity';
import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import { RemoveTeamMemberHandler } from './remove-team-member.handler';

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
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn().mockResolvedValue(true),
  findMembers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('RemoveTeamMemberHandler', () => {
  it('removes membership when team and membership exist', async () => {
    const teamRepository = makeTeamRepo();
    const handler = new RemoveTeamMemberHandler(teamRepository);

    await handler.execute(
      new RemoveTeamMemberCommand(
        '01900000-0000-7000-8000-000000000001',
        '01900000-0000-7000-8000-000000000010'
      )
    );

    expect(teamRepository.removeMember).toHaveBeenCalledWith(
      '01900000-0000-7000-8000-000000000001',
      '01900000-0000-7000-8000-000000000010'
    );
  });

  it('throws NotFoundException when team does not exist', async () => {
    const teamRepository = makeTeamRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new RemoveTeamMemberHandler(teamRepository);

    await expect(
      handler.execute(
        new RemoveTeamMemberCommand('missing-team', '01900000-0000-7000-8000-000000000010')
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when membership does not exist', async () => {
    const teamRepository = makeTeamRepo({ isMember: jest.fn().mockResolvedValue(false) });
    const handler = new RemoveTeamMemberHandler(teamRepository);

    await expect(
      handler.execute(
        new RemoveTeamMemberCommand(
          '01900000-0000-7000-8000-000000000001',
          '01900000-0000-7000-8000-000000000010'
        )
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
