import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { DeactivateUserCommand } from './deactivate-user.command';
import { DeactivateUserHandler } from './deactivate-user.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');
const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeUser = (): User =>
  new User({
    id: 'user-id',
    email: 'user@test.com',
    name: 'Test User',
    passwordHash: 'hash',
    role: UserRole.STANDARD,
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
  update: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('DeactivateUserHandler', () => {
  it('deactivates an active user', async () => {
    const repo = makeRepo(makeUser());
    const handler = new DeactivateUserHandler(repo, mockClock);

    await handler.execute(new DeactivateUserCommand('user-id'));

    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.isActive).toBe(false);
  });

  it('throws NotFoundException if user not found', async () => {
    const repo = makeRepo(null);
    const handler = new DeactivateUserHandler(repo, mockClock);

    await expect(handler.execute(new DeactivateUserCommand('missing-id'))).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
