import { UserRole } from '@repo/types';

import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UserMapper } from '../../infrastructure/user.mapper';
import { ListUsersHandler } from './list-users.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeUser = (id: string, name: string): User =>
  new User({
    id,
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
    name,
    passwordHash: 'hash',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

const makeRepo = (users: User[]): UserRepositoryPort => ({
  findAll: jest.fn().mockResolvedValue(users),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('ListUsersHandler', () => {
  const mapper = new UserMapper();

  it('returns an empty array when no users exist', async () => {
    const repo = makeRepo([]);
    const handler = new ListUsersHandler(repo, mapper);

    const result = await handler.execute();

    expect(result).toEqual([]);
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns mapped response DTOs for all users', async () => {
    const users = [makeUser('id-1', 'Alice'), makeUser('id-2', 'Bob')];
    const repo = makeRepo(users);
    const handler = new ListUsersHandler(repo, mapper);

    const result = await handler.execute();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'id-1', name: 'Alice' });
    expect(result[1]).toMatchObject({ id: 'id-2', name: 'Bob' });
  });

  it('maps all fields correctly on each user', async () => {
    const user = makeUser('id-1', 'Alice');
    const repo = makeRepo([user]);
    const handler = new ListUsersHandler(repo, mapper);

    const [dto] = await handler.execute();

    expect(dto.id).toBe('id-1');
    expect(dto.email).toBe('alice@test.com');
    expect(dto.role).toBe(UserRole.STANDARD);
    expect(dto.isActive).toBe(true);
    expect(dto.createdAt).toBe(NOW.toISOString());
    expect(dto.updatedAt).toBe(NOW.toISOString());
  });
});
