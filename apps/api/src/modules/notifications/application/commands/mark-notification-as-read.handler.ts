import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';

import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { MarkNotificationAsReadCommand } from './mark-notification-as-read.command';

/**
 * Handler for marking a notification as read.
 *
 * Validates that the notification exists and belongs to the user before marking it.
 */
@CommandHandler(MarkNotificationAsReadCommand)
export class MarkNotificationAsReadHandler implements ICommandHandler<MarkNotificationAsReadCommand> {
  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepository: NotificationRepositoryPort
  ) {}

  /**
   * Executes the command to mark a notification as read.
   *
   * @param {MarkNotificationAsReadCommand} command - Command with notification ID and user ID
   * @returns {Promise<void>}
   * @throws {NotFoundException} If notification not found
   * @throws {ForbiddenException} If user doesn't own the notification
   */
  async execute(command: MarkNotificationAsReadCommand): Promise<void> {
    const notification = await this.notificationRepository.findById(command.notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification with id ${command.notificationId} not found`);
    }

    if (notification.userId !== command.userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    if (notification.read) {
      return;
    }

    const updatedNotification = notification.markAsRead();
    await this.notificationRepository.save(updatedNotification);
  }
}
