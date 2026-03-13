import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { User } from '../../domain/user.entity';
import { DeleteUserCommand } from './delete-user.command';
import { DeleteUserHandler } from './delete-user.handler';

const NOW = new Date('2026-03-13T00:00:00.000Z');

function makeUser(): User {
  return new User({
    id: '0195b000-0000-7000-8000-000000000001',
    email: 'user@example.com',
    name: 'User',
    passwordHash: null,
    role: UserRole.STANDARD,
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function makeRepo(overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(makeUser()),
    findByEmail: jest.fn(),
    findByActivationTokenHash: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    hasActiveAbsences: jest.fn().mockResolvedValue(false),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('DeleteUserHandler', () => {
  it('deletes user when exists and has no active absences', async () => {
    const repo = makeRepo();
    const handler = new DeleteUserHandler(repo);

    await handler.execute(new DeleteUserCommand('0195b000-0000-7000-8000-000000000001'));

    expect(repo.hasActiveAbsences).toHaveBeenCalledWith('0195b000-0000-7000-8000-000000000001');
    expect(repo.delete).toHaveBeenCalledWith('0195b000-0000-7000-8000-000000000001');
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new DeleteUserHandler(repo);

    await expect(handler.execute(new DeleteUserCommand('missing-user'))).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('throws ConflictException when user has active absences', async () => {
    const repo = makeRepo({ hasActiveAbsences: jest.fn().mockResolvedValue(true) });
    const handler = new DeleteUserHandler(repo);

    await expect(
      handler.execute(new DeleteUserCommand('0195b000-0000-7000-8000-000000000001'))
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
