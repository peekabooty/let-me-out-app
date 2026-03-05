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
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../../absences/domain/ports/absence.repository.port';
import { AttachmentResponseDto } from '../dtos/attachment-response.dto';

/**
 * Handler for UploadAttachmentCommand.
 * Validates the file, stores it to disk, and persists metadata to the database.
 *
 * Implements RF-59: Only involved users (creator + validators) can upload attachments.
 * Implements RF-60/RF-61: File type and size validation.
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
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort,
    private readonly fileValidationService: FileValidationService,
    private readonly clockService: ClockService
  ) {}

  /**
   * Executes the upload attachment command.
   *
   * @param {UploadAttachmentCommand} command - The command containing upload data
   * @returns {Promise<AttachmentResponseDto>} The created attachment metadata
   * @throws {NotFoundException} If the observation does not exist
   * @throws {ForbiddenException} If the user is not the creator or an assigned validator
   * @throws {BadRequestException} If the file fails validation
   */
  async execute(command: UploadAttachmentCommand): Promise<AttachmentResponseDto> {
    // Verify observation exists
    const observation = await this.observationRepository.findById(command.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${command.observationId} not found`);
    }

    // Verify the parent absence exists
    const absence = await this.absenceRepository.findById(observation.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${observation.absenceId} not found`);
    }

    // RF-59: Verify user is involved (absence creator or assigned validator)
    const isCreator = absence.userId === command.userId;
    const assignedValidators = await this.absenceRepository.getAssignedValidators(
      observation.absenceId
    );
    const isValidator = assignedValidators.includes(command.userId);

    if (!isCreator && !isValidator) {
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
