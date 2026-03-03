import { NotFoundException, ForbiddenException } from '@nestjs/common';

import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { Notification } from '../../domain/notification.entity';
import { MarkNotificationAsReadCommand } from './mark-notification-as-read.command';
import { MarkNotificationAsReadHandler } from './mark-notification-as-read.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-123',
  userId: 'user-123',
  absenceId: 'absence-123',
  type: 'absence_assigned',
  message: 'You have been assigned to validate an absence',
  read: false,
  createdAt: NOW,
  markAsRead: function () {
    return { ...this, read: true } as Notification;
  },
  ...overrides,
});

const makeRepo = (
  overrides: Partial<NotificationRepositoryPort> = {}
): NotificationRepositoryPort => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe('MarkNotificationAsReadHandler', () => {
  it('marks an unread notification as read', async () => {
    const notification = makeNotification();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(notification) });
    const handler = new MarkNotificationAsReadHandler(repo);
    const command = new MarkNotificationAsReadCommand('notif-123', 'user-123');

    await handler.execute(command);

    expect(repo.findById).toHaveBeenCalledWith('notif-123');
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = (repo.save as jest.Mock).mock.calls[0][0] as Notification;
    expect(saved.read).toBe(true);
  });

  it('does not save if notification is already read', async () => {
    const notification = makeNotification({ read: true });
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(notification) });
    const handler = new MarkNotificationAsReadHandler(repo);
    const command = new MarkNotificationAsReadCommand('notif-123', 'user-123');

    await handler.execute(command);

    expect(repo.findById).toHaveBeenCalledWith('notif-123');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if notification does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new MarkNotificationAsReadHandler(repo);
    const command = new MarkNotificationAsReadCommand('notif-999', 'user-123');

    await expect(handler.execute(command)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException if user does not own the notification', async () => {
    const notification = makeNotification({ userId: 'user-999' });
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(notification) });
    const handler = new MarkNotificationAsReadHandler(repo);
    const command = new MarkNotificationAsReadCommand('notif-123', 'user-123');

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
