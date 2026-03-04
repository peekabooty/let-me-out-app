import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AbsencesModule } from '../absences/absences.module';
import { OBSERVATION_REPOSITORY_PORT } from './domain/ports/observation.repository.port';
import { ObservationPrismaRepository } from './infrastructure/observation.prisma.repository';
import { ObservationMapper } from './infrastructure/observation.mapper';
import { ObservationsController } from './infrastructure/observations.controller';
import { CreateObservationHandler } from './application/commands/create-observation.handler';
import { ListObservationsHandler } from './application/queries/list-observations.handler';
import { OBSERVATION_ATTACHMENT_REPOSITORY_PORT } from './domain/ports/observation-attachment.repository.port';
import { FILE_STORAGE_PORT } from './domain/ports/file-storage.port';
import { ObservationAttachmentPrismaRepository } from './infrastructure/observation-attachment.prisma.repository';
import { LocalFileStorageService } from './infrastructure/local-file-storage.service';
import { FileValidationService } from './domain/services/file-validation.service';
import { ObservationAttachmentsController } from './infrastructure/observation-attachments.controller';
import { UploadAttachmentHandler } from './application/commands/upload-attachment.handler';
import { DownloadAttachmentHandler } from './application/queries/download-attachment.handler';
import { ListAttachmentsHandler } from './application/queries/list-attachments.handler';

const commandHandlers = [CreateObservationHandler, UploadAttachmentHandler];
const queryHandlers = [ListObservationsHandler, DownloadAttachmentHandler, ListAttachmentsHandler];

@Module({
  imports: [CqrsModule, PrismaModule, AbsencesModule],
  controllers: [ObservationsController, ObservationAttachmentsController],
  providers: [
    ClockService,
    // Repositories
    {
      provide: OBSERVATION_REPOSITORY_PORT,
      useClass: ObservationPrismaRepository,
    },
    {
      provide: OBSERVATION_ATTACHMENT_REPOSITORY_PORT,
      useClass: ObservationAttachmentPrismaRepository,
    },
    // File storage
    {
      provide: FILE_STORAGE_PORT,
      useClass: LocalFileStorageService,
    },
    // Services
    FileValidationService,
    // Mappers
    ObservationMapper,
    // Handlers
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [OBSERVATION_REPOSITORY_PORT],
})
export class ObservationsModule {}
