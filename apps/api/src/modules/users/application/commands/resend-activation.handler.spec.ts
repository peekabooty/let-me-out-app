import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import { UserRole } from '@repo/types';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import type { EmailServicePort } from '../../../notifications/domain/ports/email-service.port';
import { EmailTemplateService } from '../../../notifications/domain/services/email-template.service';
import { ResendActivationCommand } from './resend-activation.command';
import { ResendActivationHandler } from './resend-activation.handler';

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

const mockEmailService: EmailServicePort = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
} as unknown as ConfigService;

const emailTemplateService = new EmailTemplateService();

describe('ResendActivationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates new token and sends activation email', async () => {
    const user = makeUser();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(user) });
    const handler = new ResendActivationHandler(
      repo,
      mockEmailService,
      mockClock,
      mockConfigService,
      emailTemplateService
    );

    await handler.execute(new ResendActivationCommand('user-id'));

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updated.activationTokenHash).not.toBeNull();
    expect(updated.activationTokenExpiresAt).not.toBeNull();
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    expect((mockEmailService.sendEmail as jest.Mock).mock.calls[0][0]).toBe('test@example.com');
  });

  it('throws NotFoundException when user is not found', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new ResendActivationHandler(
      repo,
      mockEmailService,
      mockClock,
      mockConfigService,
      emailTemplateService
    );

    await expect(
      handler.execute(new ResendActivationCommand('nonexistent-id'))
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when user is already active', async () => {
    const user = makeUser({ isActive: true, passwordHash: 'hash' });
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(user) });
    const handler = new ResendActivationHandler(
      repo,
      mockEmailService,
      mockClock,
      mockConfigService,
      emailTemplateService
    );

    await expect(handler.execute(new ResendActivationCommand('user-id'))).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });
});
