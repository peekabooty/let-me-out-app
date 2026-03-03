import type { notification as PrismaNotification } from '@prisma/client';

import type { Notification } from '../domain/notification.entity';

/**
 * Maps a Prisma notification to a domain entity.
 *
 * @param {PrismaNotification} prisma - Prisma notification model
 * @returns {Notification} Domain notification entity
 */
export function toDomain(prisma: PrismaNotification): Notification {
  return {
    id: prisma.id,
    userId: prisma.user_id,
    absenceId: prisma.absence_id,
    type: prisma.type,
    message: prisma.message,
    read: prisma.read,
    createdAt: prisma.created_at,
    markAsRead: function () {
      return {
        ...this,
        read: true,
      } as Notification;
    },
  } as Notification;
}

/**
 * Maps a domain entity to Prisma create input.
 *
 * @param {Notification} domain - Domain notification entity
 * @returns {object} Prisma create input
 */
export function toPrismaCreate(domain: Notification): {
  id: string;
  user_id: string;
  absence_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: Date;
} {
  return {
    id: domain.id,
    user_id: domain.userId,
    absence_id: domain.absenceId,
    type: domain.type,
    message: domain.message,
    read: domain.read,
    created_at: domain.createdAt,
  };
}
