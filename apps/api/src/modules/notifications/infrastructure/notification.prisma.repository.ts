import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { NotificationRepositoryPort } from '../domain/ports/notification.repository.port';
import type { Notification } from '../domain/notification.entity';
import * as NotificationMapper from './notification.mapper';

/**
 * Prisma implementation of the notification repository.
 */
@Injectable()
export class NotificationPrismaRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves a notification (creates or updates).
   *
   * @param {Notification} notification - Notification to save
   * @returns {Promise<void>}
   */
  async save(notification: Notification): Promise<void> {
    const data = NotificationMapper.toPrismaCreate(notification);

    await this.prisma.notification.upsert({
      where: { id: notification.id },
      create: data,
      update: {
        read: data.read,
      },
    });
  }

  /**
   * Finds a notification by ID.
   *
   * @param {string} id - Notification ID
   * @returns {Promise<Notification | null>}
   */
  async findById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    return notification ? NotificationMapper.toDomain(notification) : null;
  }

  /**
   * Finds all notifications for a user.
   *
   * @param {string} userId - User ID
   * @returns {Promise<Notification[]>}
   */
  async findByUserId(userId: string): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return notifications.map((notification) => NotificationMapper.toDomain(notification));
  }
}
