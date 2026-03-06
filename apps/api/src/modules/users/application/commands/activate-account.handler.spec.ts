import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import { UserRole } from '@repo/types';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { ActivateAccountCommand } from './activate-account.command';
import { ActivateAccountHandler } from './activate-account.handler';

const NOW = new Date('2025-01-01T12:00:00.000Z');
const mockClock: ClockService = { now: () => NOW } as ClockService;

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: null,
    role: UserRole.STANDARD,
    isActive: false,
    activationTokenHash: null,
    activationTokenExpiresAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
}

const makeRepo = (overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ActivateAccountHandler', () => {
  const rawToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const validExpiry = new Date(NOW.getTime() + 60_000); // expires in future

  it('activates the user when token is valid and not expired', async () => {
    const user = makeUser({
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: validExpiry,
    });
    const repo = makeRepo({
      findByActivationTokenHash: jest.fn().mockResolvedValue(user),
    });
    const handler = new ActivateAccountHandler(repo, mockClock);

    await handler.execute(new ActivateAccountCommand(rawToken, 'newpassword123'));

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.isActive).toBe(true);
    expect(updated.activationTokenHash).toBeNull();
    expect(updated.activationTokenExpiresAt).toBeNull();
    expect(updated.passwordHash).toBeDefined();
    expect(await bcrypt.compare('newpassword123', updated.passwordHash as string)).toBe(true);
  });

  it('throws NotFoundException when token is not found', async () => {
    const repo = makeRepo({
      findByActivationTokenHash: jest.fn().mockResolvedValue(null),
    });
    const handler = new ActivateAccountHandler(repo, mockClock);

    await expect(
      handler.execute(new ActivateAccountCommand(rawToken, 'newpassword123'))
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when token is expired', async () => {
    const expiredExpiry = new Date(NOW.getTime() - 1000); // already expired
    const user = makeUser({
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiredExpiry,
    });
    const repo = makeRepo({
      findByActivationTokenHash: jest.fn().mockResolvedValue(user),
    });
    const handler = new ActivateAccountHandler(repo, mockClock);

    await expect(
      handler.execute(new ActivateAccountCommand(rawToken, 'newpassword123'))
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
