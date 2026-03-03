import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { UploadAttachmentCommand } from './upload-attachment.command';
import { ObservationAttachment } from '../../domain/observation-attachment.entity';
import {
  ObservationAttachmentRepositoryPort,
  OBSERVATION_ATTACHMENT_REPOSITORY_PORT,
} from '../../domain/ports/observation-attachment.repository.port';
import { FileStoragePort, FILE_STORAGE_PORT } from '../../domain/ports/file-storage.port';
import { FileValidationService } from '../../domain/services/file-validation.service';
import { ClockService } from '../../../../common/clock/clock.service';
import {
  ObservationRepositoryPort,
  OBSERVATION_REPOSITORY_PORT,
} from '../../domain/ports/observation.repository.port';
import { AttachmentResponseDto } from '../dtos/attachment-response.dto';

/**
 * Handler for UploadAttachmentCommand.
 * Validates the file, stores it to disk, and persists metadata to the database.
 *
 * @implements {ICommandHandler<UploadAttachmentCommand>}
 */
@CommandHandler(UploadAttachmentCommand)
export class UploadAttachmentHandler implements ICommandHandler<UploadAttachmentCommand> {
  constructor(
    @Inject(OBSERVATION_ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: ObservationAttachmentRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort,
    private readonly fileValidationService: FileValidationService,
    private readonly clockService: ClockService
  ) {}

  /**
   * Executes the upload attachment command.
   *
   * @param {UploadAttachmentCommand} command - The command containing upload data
   * @returns {Promise<AttachmentResponseDto>} The created attachment metadata
   * @throws {NotFoundException} If the observation does not exist
   * @throws {ForbiddenException} If the user doesn't have access to the observation
   * @throws {BadRequestException} If the file fails validation
   */
  async execute(command: UploadAttachmentCommand): Promise<AttachmentResponseDto> {
    // Verify observation exists and user has access
    const observations = await this.observationRepository.findByAbsenceId(command.observationId);
    const observation = observations.find((obs) => obs.id === command.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${command.observationId} not found`);
    }

    // For simplicity, we check if the user is the owner of the observation
    // In a real scenario, we'd check if the user has access to the parent absence
    if (observation.userId !== command.userId) {
      throw new ForbiddenException(
        'You do not have permission to upload attachments to this observation'
      );
    }

    // Validate file MIME type and size (throws BadRequestException on failure)
    const mimeType = await this.fileValidationService.validateFile(
      command.buffer,
      command.originalFilename
    );

    // Generate stored filename: UUID v7 + extension from mime type
    const extension = this.fileValidationService.getExtensionForMimeType(mimeType);
    const storedFilename = `${uuidv7()}.${extension}`;

    // Save file to storage
    await this.fileStorage.saveFile(command.buffer, storedFilename);

    // Create attachment entity
    const attachment = new ObservationAttachment({
      id: uuidv7(),
      observationId: command.observationId,
      filename: command.originalFilename,
      storedFilename,
      mimeType,
      sizeBytes: command.buffer.length,
      createdAt: this.clockService.now(),
    });

    // Persist metadata
    await this.attachmentRepository.save(attachment);

    return AttachmentResponseDto.fromEntity(attachment);
  }
}
