import { Logger } from '@nestjs/common';

import { AbsenceCreatedEvent } from '../../../absences/domain/events/absence-created.event';
import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { EmailServicePort } from '../../domain/ports/email-service.port';
import { AbsenceCreatedEventHandler } from './absence-created.event-handler';

// Mock uuidv7
jest.mock('uuidv7', () => ({
  uuidv7: jest.fn(() => 'notif-uuid-123'),
}));

const START_DATE = new Date('2025-02-01T00:00:00.000Z');
const END_DATE = new Date('2025-02-05T00:00:00.000Z');

const makeEvent = (overrides: Partial<AbsenceCreatedEvent> = {}): AbsenceCreatedEvent =>
  new AbsenceCreatedEvent(
    overrides.absenceId ?? 'absence-123',
    overrides.userId ?? 'employee-123',
    overrides.absenceTypeId ?? 'absence-type-123',
    overrides.startAt ?? START_DATE,
    overrides.endAt ?? END_DATE,
    overrides.duration ?? 5,
    overrides.status ?? null,
    overrides.validatorIds ?? ['validator-1', 'validator-2']
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
    if (id === 'employee-123') {
      return Promise.resolve({ name: 'John Doe', email: 'john@test.com' });
    }
    if (id === 'validator-1') {
      return Promise.resolve({ name: 'Validator One', email: 'validator1@test.com' });
    }
    if (id === 'validator-2') {
      return Promise.resolve({ name: 'Validator Two', email: 'validator2@test.com' });
    }
    return Promise.resolve(null);
  }),
});

describe('AbsenceCreatedEventHandler', () => {
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

  it('creates in-app notifications and sends emails to all validators', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const handler = new AbsenceCreatedEventHandler(notificationRepo, emailService, userRepository);
    const event = makeEvent();

    await handler.handle(event);

    // Verify employee was fetched
    expect(userRepository.findById).toHaveBeenCalledWith('employee-123');

    // Verify 2 validators were fetched
    expect(userRepository.findById).toHaveBeenCalledWith('validator-1');
    expect(userRepository.findById).toHaveBeenCalledWith('validator-2');

    // Verify 2 in-app notifications were created
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);

    // Verify 2 emails were sent
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'validator1@test.com',
      'Nueva ausencia asignada para validación',
      expect.stringContaining('John Doe')
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'validator2@test.com',
      'Nueva ausencia asignada para validación',
      expect.stringContaining('John Doe')
    );
  });

  it('skips notifications if employee not found', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };
    const handler = new AbsenceCreatedEventHandler(notificationRepo, emailService, userRepository);
    const event = makeEvent();

    await handler.handle(event);

    expect(userRepository.findById).toHaveBeenCalledWith('employee-123');
    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Employee employee-123 not found, skipping notifications'
    );
  });

  it('skips notification for a validator that does not exist', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService();
    const userRepository = {
      findById: jest.fn((id: string) => {
        if (id === 'employee-123') {
          return Promise.resolve({ name: 'John Doe', email: 'john@test.com' });
        }
        return Promise.resolve(null);
      }),
    };
    const handler = new AbsenceCreatedEventHandler(notificationRepo, emailService, userRepository);
    const event = makeEvent({ validatorIds: ['validator-999'] });

    await handler.handle(event);

    expect(userRepository.findById).toHaveBeenCalledWith('validator-999');
    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith('Validator validator-999 not found, skipping');
  });

  it('continues processing other validators if email sending fails', async () => {
    const notificationRepo = makeNotificationRepo();
    const emailService = makeEmailService({
      sendEmail: jest
        .fn()
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(null),
    });
    const userRepository = makeUserRepository();
    const handler = new AbsenceCreatedEventHandler(notificationRepo, emailService, userRepository);
    const event = makeEvent();

    await handler.handle(event);

    // Both in-app notifications should be created
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);

    // Email sending was attempted for both
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

    // Error was logged for the first failure
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to send email to validator validator-1',
      expect.any(String)
    );
  });

  it('continues processing other validators if notification save fails', async () => {
    const notificationRepo = makeNotificationRepo({
      save: jest.fn().mockRejectedValueOnce(new Error('DB error')).mockResolvedValueOnce(null),
    });
    const emailService = makeEmailService();
    const userRepository = makeUserRepository();
    const handler = new AbsenceCreatedEventHandler(notificationRepo, emailService, userRepository);
    const event = makeEvent();

    await handler.handle(event);

    // Both notifications were attempted
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);

    // Error was logged
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to notify validator validator-1 for absence absence-123',
      expect.any(String)
    );
  });
});
