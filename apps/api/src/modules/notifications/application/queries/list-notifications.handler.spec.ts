import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { Notification } from '../../domain/notification.entity';
import { ListNotificationsQuery } from './list-notifications.query';
import { ListNotificationsHandler } from './list-notifications.handler';

const NOW = new Date('2025-06-01T10:00:00.000Z');

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  absenceId: 'absence-1',
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
  findByUserId: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe('ListNotificationsHandler', () => {
  it('returns an empty array when the user has no notifications', async () => {
    const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue([]) });
    const handler = new ListNotificationsHandler(repo);
    const query = new ListNotificationsQuery('user-1');

    const result = await handler.execute(query);

    expect(repo.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([]);
  });

  it('maps notifications to DTOs with ISO dates', async () => {
    const notification = makeNotification();
    const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue([notification]) });
    const handler = new ListNotificationsHandler(repo);
    const query = new ListNotificationsQuery('user-1');

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'notif-1',
      userId: 'user-1',
      absenceId: 'absence-1',
      type: 'absence_assigned',
      message: 'You have been assigned to validate an absence',
      read: false,
      createdAt: NOW.toISOString(),
    });
  });

  it('preserves the read flag as true when already read', async () => {
    const notification = makeNotification({ read: true });
    const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue([notification]) });
    const handler = new ListNotificationsHandler(repo);

    const result = await handler.execute(new ListNotificationsQuery('user-1'));

    expect(result[0].read).toBe(true);
  });

  it('returns multiple notifications ordered as provided by the repository', async () => {
    const n1 = makeNotification({ id: 'notif-1' });
    const n2 = makeNotification({ id: 'notif-2', createdAt: new Date('2025-06-02T10:00:00.000Z') });
    const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue([n2, n1]) });
    const handler = new ListNotificationsHandler(repo);

    const result = await handler.execute(new ListNotificationsQuery('user-1'));

    expect(result[0].id).toBe('notif-2');
    expect(result[1].id).toBe('notif-1');
  });
});
