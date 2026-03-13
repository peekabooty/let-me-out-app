import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UserMapper } from '../../infrastructure/user.mapper';
import { GetUserQuery } from './get-user.query';
import { GetUserHandler } from './get-user.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeUser = (): User =>
  new User({
    id: 'user-id',
    email: 'alice@test.com',
    name: 'Alice',
    passwordHash: 'hash',
    role: UserRole.VALIDATOR,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

const makeRepo = (user: User | null): UserRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  hasActiveAbsences: jest.fn().mockResolvedValue(false),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('GetUserHandler', () => {
  const mapper = new UserMapper();

  it('returns the mapped response DTO when user exists', async () => {
    const repo = makeRepo(makeUser());
    const handler = new GetUserHandler(repo, mapper);

    const dto = await handler.execute(new GetUserQuery('user-id'));

    expect(dto.id).toBe('user-id');
    expect(dto.email).toBe('alice@test.com');
    expect(dto.name).toBe('Alice');
    expect(dto.role).toBe(UserRole.VALIDATOR);
    expect(dto.isActive).toBe(true);
    expect(dto.createdAt).toBe(NOW.toISOString());
    expect(dto.updatedAt).toBe(NOW.toISOString());
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = makeRepo(null);
    const handler = new GetUserHandler(repo, mapper);

    await expect(handler.execute(new GetUserQuery('missing-id'))).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(repo.findById).toHaveBeenCalledWith('missing-id');
  });
});
