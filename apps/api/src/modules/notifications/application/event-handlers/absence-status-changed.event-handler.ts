import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { AbsenceStatusChangedEvent } from '../../../absences/domain/events/absence-status-changed.event';
import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { EmailServicePort } from '../../domain/ports/email-service.port';
import { Notification } from '../../domain/notification.entity';
import { EmailTemplateService } from '../../domain/services/email-template.service';
import type { AbsenceStatus } from '@repo/types';

/**
 * Event handler for absence status change events.
 *
 * Creates in-app notifications and sends emails to absence creators.
 * Implements RF-48 (notify creator) and RF-49 (in-app + email channels).
 */
@EventsHandler(AbsenceStatusChangedEvent)
export class AbsenceStatusChangedEventHandler implements IEventHandler<AbsenceStatusChangedEvent> {
  private readonly logger = new Logger(AbsenceStatusChangedEventHandler.name);
  private readonly emailTemplateService = new EmailTemplateService();

  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepository: NotificationRepositoryPort,
    @Inject('EmailServicePort')
    private readonly emailService: EmailServicePort,
    @Inject('UserRepository')
    private readonly userRepository: {
      findById: (id: string) => Promise<{ name: string; email: string } | null>;
    },
    @Inject('AbsenceRepository')
    private readonly absenceRepository: {
      findById: (id: string) => Promise<{ startAt: Date; endAt: Date } | null>;
    }
  ) {}

  /**
   * Handles the absence status changed event.
   *
   * @param {AbsenceStatusChangedEvent} event - Event data
   * @returns {Promise<void>}
   */
  async handle(event: AbsenceStatusChangedEvent): Promise<void> {
    this.logger.log(
      `Handling absence status changed event for absence ${event.absenceId}: ${String(event.fromStatus)} -> ${event.toStatus}`
    );

    try {
      await this.notifyAbsenceCreator(event);
    } catch (error) {
      this.logger.error(
        `Failed to notify creator for absence ${event.absenceId}`,
        error instanceof Error ? error.stack : String(error)
      );
    }
  }

  /**
   * Notifies the absence creator (in-app + email).
   *
   * @param {AbsenceStatusChangedEvent} event - Event data
   * @returns {Promise<void>}
   */
  private async notifyAbsenceCreator(event: AbsenceStatusChangedEvent): Promise<void> {
    const user = await this.userRepository.findById(event.userId);
    if (!user) {
      this.logger.warn(`User ${event.userId} not found, skipping notification`);
      return;
    }

    const absence = await this.absenceRepository.findById(event.absenceId);
    if (!absence) {
      this.logger.warn(`Absence ${event.absenceId} not found, skipping notification`);
      return;
    }

    const statusLabels: Record<AbsenceStatus, string> = {
      waiting_validation: 'Pendiente de validación',
      accepted: 'Aprobada',
      reconsider: 'En reconsideración',
      cancelled: 'Cancelada',
      discarded: 'Descartada',
    };

    const statusLabel = statusLabels[event.toStatus] || event.toStatus;

    // Create in-app notification
    const notification = Notification.create(
      uuidv7(),
      event.userId,
      event.absenceId,
      'status_change',
      `Tu ausencia ha cambiado a: ${statusLabel}`
    );

    await this.notificationRepository.save(notification);
    this.logger.log(`In-app notification created for user ${event.userId}`);

    // Send email
    try {
      const emailHtml = this.emailTemplateService.generateStatusChangeEmail(
        user.name,
        event.toStatus,
        absence.startAt.toISOString(),
        absence.endAt.toISOString()
      );

      await this.emailService.sendEmail(user.email, 'Cambio de estado de tu ausencia', emailHtml);

      this.logger.log(`Email sent to user ${event.userId} at ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to user ${event.userId}`,
        error instanceof Error ? error.stack : String(error)
      );
    }
  }
}
