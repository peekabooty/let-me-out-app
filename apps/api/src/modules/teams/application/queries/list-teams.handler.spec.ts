import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { Team } from '../../domain/team.entity';
import { TeamMapper } from '../../infrastructure/team.mapper';
import { ListTeamsHandler } from './list-teams.handler';

const makeRepo = (overrides: Partial<TeamRepositoryPort> = {}): TeamRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn(),
  ...overrides,
});

describe('ListTeamsHandler', () => {
  it('returns mapped team list', async () => {
    const team = new Team({
      id: '01900000-0000-7000-8000-000000000001',
      name: 'Engineering',
      color: '#112233',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const repo = makeRepo({
      findAll: jest.fn().mockResolvedValue([team]),
    });
    const handler = new ListTeamsHandler(repo, new TeamMapper());

    const result = await handler.execute();

    expect(result).toEqual([
      {
        id: team.id,
        name: 'Engineering',
        color: '#112233',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });
});
