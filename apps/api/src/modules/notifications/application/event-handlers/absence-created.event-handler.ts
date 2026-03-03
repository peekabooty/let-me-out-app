import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { AbsenceCreatedEvent } from '../../../absences/domain/events/absence-created.event';
import type { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import type { EmailServicePort } from '../../domain/ports/email-service.port';
import { Notification } from '../../domain/notification.entity';
import { EmailTemplateService } from '../../domain/services/email-template.service';

/**
 * Event handler for absence creation events.
 *
 * Creates in-app notifications and sends emails to assigned validators.
 * Implements RF-47 (notify validators) and RF-49 (in-app + email channels).
 */
@EventsHandler(AbsenceCreatedEvent)
export class AbsenceCreatedEventHandler implements IEventHandler<AbsenceCreatedEvent> {
  private readonly logger = new Logger(AbsenceCreatedEventHandler.name);
  private readonly emailTemplateService = new EmailTemplateService();

  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepository: NotificationRepositoryPort,
    @Inject('EmailServicePort')
    private readonly emailService: EmailServicePort,
    @Inject('UserRepository')
    private readonly userRepository: {
      findById: (id: string) => Promise<{ name: string; email: string } | null>;
    }
  ) {}

  /**
   * Handles the absence created event.
   *
   * @param {AbsenceCreatedEvent} event - Event data
   * @returns {Promise<void>}
   */
  async handle(event: AbsenceCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling absence created event for absence ${event.absenceId} with ${event.validatorIds.length} validators`
    );

    // Get employee name for email
    const employee = await this.userRepository.findById(event.userId);
    if (!employee) {
      this.logger.error(`Employee ${event.userId} not found, skipping notifications`);
      return;
    }

    // Notify each validator
    for (const validatorId of event.validatorIds) {
      try {
        await this.notifyValidator(
          validatorId,
          event.absenceId,
          employee.name,
          event.startAt,
          event.endAt,
          event.duration
        );
      } catch (error) {
        this.logger.error(
          `Failed to notify validator ${validatorId} for absence ${event.absenceId}`,
          error instanceof Error ? error.stack : String(error)
        );
      }
    }
  }

  /**
   * Notifies a single validator (in-app + email).
   *
   * @param {string} validatorId - Validator user ID
   * @param {string} absenceId - Absence ID
   * @param {string} employeeName - Employee name
   * @param {Date} startAt - Start date
   * @param {Date} endAt - End date
   * @param {number} duration - Duration
   * @returns {Promise<void>}
   */
  private async notifyValidator(
    validatorId: string,
    absenceId: string,
    employeeName: string,
    startAt: Date,
    endAt: Date,
    duration: number
  ): Promise<void> {
    const validator = await this.userRepository.findById(validatorId);
    if (!validator) {
      this.logger.warn(`Validator ${validatorId} not found, skipping`);
      return;
    }

    // Create in-app notification
    const notification = Notification.create(
      uuidv7(),
      validatorId,
      absenceId,
      'validator_assignment',
      `Nueva ausencia de ${employeeName} asignada para validación`
    );

    await this.notificationRepository.save(notification);
    this.logger.log(`In-app notification created for validator ${validatorId}`);

    // Send email
    try {
      const emailHtml = this.emailTemplateService.generateValidatorAssignmentEmail(
        validator.name,
        employeeName,
        startAt.toISOString(),
        endAt.toISOString(),
        duration
      );

      await this.emailService.sendEmail(
        validator.email,
        'Nueva ausencia asignada para validación',
        emailHtml
      );

      this.logger.log(`Email sent to validator ${validatorId} at ${validator.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to validator ${validatorId}`,
        error instanceof Error ? error.stack : String(error)
      );
    }
  }
}
