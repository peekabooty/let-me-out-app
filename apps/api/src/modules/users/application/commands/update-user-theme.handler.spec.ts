import { NotFoundException } from '@nestjs/common';
import { Theme, UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UpdateUserThemeCommand } from './update-user-theme.command';
import { UpdateUserThemeHandler } from './update-user-theme.handler';

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
    themePreference: Theme.LIGHT,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

const makeRepo = (user: User | null): UserRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(null),
});

describe('UpdateUserThemeHandler', () => {
  it('updates theme preference', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const handler = new UpdateUserThemeHandler(repo, mockClock);

    await handler.execute(new UpdateUserThemeCommand('user-id', Theme.CHOCOLATE));

    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.themePreference).toBe(Theme.CHOCOLATE);
    expect(updated.updatedAt).toBe(NOW);
  });

  it('throws NotFoundException if user does not exist', async () => {
    const repo = makeRepo(null);
    const handler = new UpdateUserThemeHandler(repo, mockClock);

    await expect(
      handler.execute(new UpdateUserThemeCommand('missing-user', Theme.DARK))
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
