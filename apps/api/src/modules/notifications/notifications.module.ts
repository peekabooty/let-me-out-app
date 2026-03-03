import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationPrismaRepository } from './infrastructure/notification.prisma.repository';
import { NodemailerService } from './infrastructure/nodemailer.service';
import { MarkNotificationAsReadHandler } from './application/commands/mark-notification-as-read.handler';
import { AbsenceCreatedEventHandler } from './application/event-handlers/absence-created.event-handler';
import { AbsenceStatusChangedEventHandler } from './application/event-handlers/absence-status-changed.event-handler';
import { UsersModule } from '../users/users.module';
import { AbsencesModule } from '../absences/absences.module';
import { USER_REPOSITORY_PORT } from '../users/domain/ports/user.repository.port';
import { ABSENCE_REPOSITORY_PORT } from '../absences/domain/ports/absence.repository.port';

const CommandHandlers = [MarkNotificationAsReadHandler];

const EventHandlers = [AbsenceCreatedEventHandler, AbsenceStatusChangedEventHandler];

/**
 * Module for notification-related functionality.
 *
 * Provides:
 * - In-app notifications
 * - Email notifications
 * - Event-driven notification system
 */
@Module({
  imports: [CqrsModule, PrismaModule, ConfigModule, UsersModule, AbsencesModule],
  providers: [
    ...CommandHandlers,
    ...EventHandlers,
    {
      provide: 'NotificationRepositoryPort',
      useClass: NotificationPrismaRepository,
    },
    {
      provide: 'EmailServicePort',
      useClass: NodemailerService,
    },
    {
      provide: 'UserRepository',
      useExisting: USER_REPOSITORY_PORT,
    },
    {
      provide: 'AbsenceRepository',
      useExisting: ABSENCE_REPOSITORY_PORT,
    },
  ],
  exports: ['NotificationRepositoryPort'],
})
export class NotificationsModule {}
