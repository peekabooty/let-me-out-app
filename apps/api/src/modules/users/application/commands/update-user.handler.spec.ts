import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserHandler } from './update-user.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');
const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeUser = (overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User =>
  new User({
    id: 'user-id',
    email: 'user@test.com',
    name: 'Original Name',
    passwordHash: 'hash',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

const makeRepo = (user: User | null): UserRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  hasActiveAbsences: jest.fn().mockResolvedValue(false),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('UpdateUserHandler', () => {
  it('updates name', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const handler = new UpdateUserHandler(repo, mockClock);

    await handler.execute(new UpdateUserCommand('user-id', 'New Name', undefined));

    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.name).toBe('New Name');
  });

  it('updates role', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const handler = new UpdateUserHandler(repo, mockClock);

    await handler.execute(new UpdateUserCommand('user-id', undefined, UserRole.VALIDATOR));

    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.role).toBe(UserRole.VALIDATOR);
  });

  it('throws NotFoundException if user not found', async () => {
    const repo = makeRepo(null);
    const handler = new UpdateUserHandler(repo, mockClock);

    await expect(
      handler.execute(new UpdateUserCommand('missing-id', 'Name'))
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
