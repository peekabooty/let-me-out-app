import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import type { EmailServicePort } from '../../../notifications/domain/ports/email-service.port';
import { EmailTemplateService } from '../../../notifications/domain/services/email-template.service';
import { CreateUserCommand } from './create-user.command';
import { CreateUserHandler } from './create-user.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = { now: () => NOW } as ClockService;

const makeRepo = (overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort => ({
  findById: jest.fn(),
  findByEmail: jest.fn().mockResolvedValue(null),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  hasActiveAbsences: jest.fn().mockResolvedValue(false),
  save: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockEmailService: EmailServicePort = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
} as unknown as ConfigService;

const emailTemplateService = new EmailTemplateService();

describe('CreateUserHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an inactive user with activation token and sends invitation email', async () => {
    const repo = makeRepo();
    const handler = new CreateUserHandler(
      repo,
      mockEmailService,
      mockClock,
      mockConfigService,
      emailTemplateService
    );
    const command = new CreateUserCommand('user@test.com', 'Test User', UserRole.STANDARD);

    const id = await handler.execute(command);

    expect(typeof id).toBe('string');
    expect(id).toHaveLength(36);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = (repo.save as jest.Mock).mock.calls[0][0] as User;
    expect(saved.email).toBe('user@test.com');
    expect(saved.name).toBe('Test User');
    expect(saved.role).toBe(UserRole.STANDARD);
    expect(saved.isActive).toBe(false);
    expect(saved.passwordHash).toBeNull();
    expect(saved.activationTokenHash).not.toBeNull();
    expect(saved.activationTokenExpiresAt).not.toBeNull();
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    expect((mockEmailService.sendEmail as jest.Mock).mock.calls[0][0]).toBe('user@test.com');
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
    const handler = new CreateUserHandler(
      repo,
      mockEmailService,
      mockClock,
      mockConfigService,
      emailTemplateService
    );
    const command = new CreateUserCommand('user@test.com', 'Test User', UserRole.STANDARD);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });
});
