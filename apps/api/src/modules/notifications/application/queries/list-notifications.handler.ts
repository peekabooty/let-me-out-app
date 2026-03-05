import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { ListNotificationsQuery } from './list-notifications.query';

export interface NotificationDto {
  id: string;
  userId: string;
  absenceId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * Query handler for listing notifications of the authenticated user.
 *
 * RF-49: In-app notification channel.
 */
@Injectable()
@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<
  ListNotificationsQuery,
  NotificationDto[]
> {
  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepository: NotificationRepositoryPort
  ) {}

  /**
   * Returns all notifications for a user, ordered by creation date descending.
   *
   * @param {ListNotificationsQuery} query - Query with userId
   * @returns {Promise<NotificationDto[]>}
   */
  async execute(query: ListNotificationsQuery): Promise<NotificationDto[]> {
    const notifications = await this.notificationRepository.findByUserId(query.userId);

    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      absenceId: n.absenceId,
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  }
}
