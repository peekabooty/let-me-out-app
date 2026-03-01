import { ConflictException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { CreateUserCommand } from './create-user.command';
import { CreateUserHandler } from './create-user.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeRepo = (overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort => ({
  findById: jest.fn(),
  findByEmail: jest.fn().mockResolvedValue(null),
  findAll: jest.fn(),
  save: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
  ...overrides,
});

describe('CreateUserHandler', () => {
  it('creates a user and returns its id', async () => {
    const repo = makeRepo();
    const handler = new CreateUserHandler(repo, mockClock);
    const command = new CreateUserCommand(
      'user@test.com',
      'Test User',
      'password123',
      UserRole.STANDARD
    );

    const id = await handler.execute(command);

    expect(typeof id).toBe('string');
    expect(id).toHaveLength(36);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = (repo.save as jest.Mock).mock.calls[0][0] as User;
    expect(saved.email).toBe('user@test.com');
    expect(saved.name).toBe('Test User');
    expect(saved.role).toBe(UserRole.STANDARD);
    expect(saved.isActive).toBe(true);
  });

  it('throws ConflictException if email already exists', async () => {
    const existingUser = new User({
      id: 'existing-id',
      email: 'user@test.com',
      name: 'Existing',
      passwordHash: 'hash',
      role: UserRole.STANDARD,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(existingUser) });
    const handler = new CreateUserHandler(repo, mockClock);
    const command = new CreateUserCommand(
      'user@test.com',
      'Test User',
      'password123',
      UserRole.STANDARD
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
