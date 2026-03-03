import { Logger } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

import { AbsenceStatusChangedEvent } from '../../../absences/domain/events/absence-status-changed.event';
import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { EmailServicePort } from '../../domain/ports/email-service.port';
import { AbsenceStatusChangedEventHandler } from './absence-status-changed.event-handler';

// Mock uuidv7
jest.mock('uuidv7', () => ({
  uuidv7: jest.fn(() => 'notif-uuid-456'),
}));

const START_DATE = new Date('2025-02-01T00:00:00.000Z');
const END_DATE = new Date('2025-02-05T00:00:00.000Z');
const CHANGED_AT = new Date('2025-01-15T10:00:00.000Z');

const makeEvent = (overrides: Partial<AbsenceStatusChangedEvent> = {}): AbsenceStatusChangedEvent =>
  new AbsenceStatusChangedEvent(
    overrides.absenceId ?? 'absence-123',
    overrides.userId ?? 'user-123',
    overrides.fromStatus ?? AbsenceStatus.WAITING_VALIDATION,
    overrides.toStatus ?? AbsenceStatus.ACCEPTED,
    overrides.changedBy ?? 'validator-123',
    overrides.changedAt ?? CHANGED_AT
  );

const makeNotificationRepo = (
  overrides: Partial<NotificationRepositoryPort> = {}
): NotificationRepositoryPort => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeEmailService = (overrides: Partial<EmailServicePort> = {}): EmailServicePort => ({
  sendEmail: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const makeUserRepository = () => ({
  findById: jest.fn((id: string) => {
    if (id === 'user-123') {
      return Promise.resolve({ name: 'Jane Doe', email: 'jane@test.com' });
    }
    return Promise.resolve(null);
  }),
});

const makeAbsenceRepository = () => ({
  findById: jest.fn((id: string) => {
    if (id === 'absence-123') {
      return Promise.resolve({ startAt: START_DATE, endAt: END_DATE });
    }
    return Promise.resolve(null);
  }),
});

describe('AbsenceStatusChangedEventHandler', () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it('creates in-app notification and sends email to absence creator', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const absenceRepository = makeAbsenceRepository();
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );
    const event = makeEvent();

    await handler.handle(event);

    // Verify user and absence were fetched
    expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    expect(absenceRepository.findById).toHaveBeenCalledWith('absence-123');

    // Verify in-app notification was created
    expect(notificationRepo.save).toHaveBeenCalledTimes(1);

    // Verify email was sent
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'jane@test.com',
      'Cambio de estado de tu ausencia',
      expect.stringContaining('Jane Doe')
    );
  });

  it('skips notification if user not found', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = { findById: jest.fn().mockResolvedValue(null) };
    const absenceRepository = makeAbsenceRepository();
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );
    const event = makeEvent();

    await handler.handle(event);

    expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    expect(absenceRepository.findById).not.toHaveBeenCalled();
    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith('User user-123 not found, skipping notification');
  });

  it('skips notification if absence not found', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const absenceRepository = { findById: jest.fn().mockResolvedValue(null) };
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );
    const event = makeEvent();

    await handler.handle(event);

    expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    expect(absenceRepository.findById).toHaveBeenCalledWith('absence-123');
    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Absence absence-123 not found, skipping notification'
    );
  });

  it('creates notification even if email sending fails', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService({
      sendEmail: jest.fn().mockRejectedValue(new Error('SMTP error')),
    });
    const userRepository = makeUserRepository();
    const absenceRepository = makeAbsenceRepository();
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );
    const event = makeEvent();

    await handler.handle(event);

    // In-app notification should be created
    expect(notificationRepo.save).toHaveBeenCalledTimes(1);

    // Email sending was attempted
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

    // Error was logged
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to send email to user user-123',
      expect.any(String)
    );
  });

  it('handles different status transitions correctly', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const absenceRepository = makeAbsenceRepository();
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );

    // Test cancelled status
    const cancelledEvent = makeEvent({
      fromStatus: AbsenceStatus.WAITING_VALIDATION,
      toStatus: AbsenceStatus.CANCELLED,
    });

    await handler.handle(cancelledEvent);

    expect(notificationRepo.save).toHaveBeenCalledTimes(1);
    const notification = (notificationRepo.save as jest.Mock).mock.calls[0][0];
    expect(notification.message).toContain('Cancelada');
  });

  it('logs errors if notification handling fails entirely', async () => {
    const notificationRepo = makeNotificationRepo({
      save: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const absenceRepository = makeAbsenceRepository();
    const handler = new AbsenceStatusChangedEventHandler(
      notificationRepo,
      emailService,
      userRepository,
      absenceRepository
    );
    const event = makeEvent();

    await handler.handle(event);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to notify creator for absence absence-123',
      expect.any(String)
    );
  });
});
