import type { ClockService } from '../../../../common';
import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import type { Team } from '../../domain/team.entity';
import { CreateTeamCommand } from './create-team.command';
import { CreateTeamHandler } from './create-team.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = {
  now: () => NOW,
} as ClockService;

const makeRepo = (overrides: Partial<TeamRepositoryPort> = {}): TeamRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn().mockResolvedValue(null),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn(),
  findMembers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('CreateTeamHandler', () => {
  it('creates a team and returns its id', async () => {
    const repo = makeRepo();
    const handler = new CreateTeamHandler(repo, mockClock);
    const command = new CreateTeamCommand('Engineering', '#123456');

    const id = await handler.execute(command);

    expect(typeof id).toBe('string');
    expect(id).toHaveLength(36);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedTeam = (repo.save as jest.Mock).mock.calls[0][0] as Team;
    expect(savedTeam.name).toBe('Engineering');
    expect(savedTeam.color).toBe('#123456');
  });
});
