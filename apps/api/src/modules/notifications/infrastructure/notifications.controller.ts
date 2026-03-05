import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListNotificationsQuery } from '../application/queries/list-notifications.query';
import { MarkNotificationAsReadCommand } from '../application/commands/mark-notification-as-read.command';
import type { NotificationDto } from '../application/queries/list-notifications.handler';

/**
 * Controller for notification endpoints.
 *
 * RF-49: In-app notification channel.
 */
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Lists all notifications for the authenticated user.
   *
   * GET /notifications
   *
   * RF-49: In-app notifications for the current user.
   */
  @Get()
  async listNotifications(@Req() request: Request): Promise<NotificationDto[]> {
    const user = request.user as { userId: string };

    return this.queryBus.execute<ListNotificationsQuery, NotificationDto[]>(
      new ListNotificationsQuery(user.userId)
    );
  }

  /**
   * Marks a notification as read.
   *
   * PATCH /notifications/:id/read
   *
   * RF-49: In-app notifications can be marked as read.
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() request: Request): Promise<void> {
    const user = request.user as { userId: string };

    return this.commandBus.execute<MarkNotificationAsReadCommand, void>(
      new MarkNotificationAsReadCommand(id, user.userId)
    );
  }
}
