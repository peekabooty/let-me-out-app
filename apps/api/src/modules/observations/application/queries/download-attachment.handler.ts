import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DownloadAttachmentQuery } from './download-attachment.query';
import {
  ObservationAttachmentRepositoryPort,
  OBSERVATION_ATTACHMENT_REPOSITORY_PORT,
} from '../../domain/ports/observation-attachment.repository.port';
import { FileStoragePort, FILE_STORAGE_PORT } from '../../domain/ports/file-storage.port';
import {
  ObservationRepositoryPort,
  OBSERVATION_REPOSITORY_PORT,
} from '../../domain/ports/observation.repository.port';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../../absences/domain/ports/absence.repository.port';

/**
 * Result of a download attachment query.
 */
export interface DownloadAttachmentResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

/**
 * Handler for DownloadAttachmentQuery.
 * Verifies user permissions and retrieves the file from storage.
 *
 * Implements RF-63: Only involved users (creator + validators) can download attachments.
 *
 * @implements {IQueryHandler<DownloadAttachmentQuery>}
 */
@QueryHandler(DownloadAttachmentQuery)
export class DownloadAttachmentHandler implements IQueryHandler<DownloadAttachmentQuery> {
  constructor(
    @Inject(OBSERVATION_ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: ObservationAttachmentRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort,
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  /**
   * Executes the download attachment query.
   *
   * @param {DownloadAttachmentQuery} query - The query containing attachment ID and user ID
   * @returns {Promise<DownloadAttachmentResult>} The file buffer and metadata
   * @throws {NotFoundException} If the attachment or observation does not exist
   * @throws {ForbiddenException} If the user is not the creator or an assigned validator
   */
  async execute(query: DownloadAttachmentQuery): Promise<DownloadAttachmentResult> {
    // Find attachment
    const attachment = await this.attachmentRepository.findById(query.attachmentId);

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${query.attachmentId} not found`);
    }

    // Find parent observation by ID
    const observation = await this.observationRepository.findById(attachment.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${attachment.observationId} not found`);
    }

    // Find parent absence
    const absence = await this.absenceRepository.findById(observation.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${observation.absenceId} not found`);
    }

    // RF-63: Verify user is involved (absence creator or assigned validator)
    const isCreator = absence.userId === query.userId;
    const assignedValidators = await this.absenceRepository.getAssignedValidators(
      observation.absenceId
    );
    const isValidator = assignedValidators.includes(query.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException('You do not have permission to download this attachment');
    }

    // Retrieve file from storage
    const buffer = await this.fileStorage.getFile(attachment.storedFilename);

    if (!buffer) {
      throw new NotFoundException(`File for attachment ${query.attachmentId} not found in storage`);
    }

    return {
      buffer,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    };
  }
}
