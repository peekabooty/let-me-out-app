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
    private readonly observationRepository: ObservationRepositoryPort
  ) {}

  /**
   * Executes the download attachment query.
   *
   * @param {DownloadAttachmentQuery} query - The query containing attachment ID and user ID
   * @returns {Promise<DownloadAttachmentResult>} The file buffer and metadata
   * @throws {NotFoundException} If the attachment does not exist
   * @throws {ForbiddenException} If the user doesn't have access to the attachment
   */
  async execute(query: DownloadAttachmentQuery): Promise<DownloadAttachmentResult> {
    // Find attachment
    const attachment = await this.attachmentRepository.findById(query.attachmentId);

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${query.attachmentId} not found`);
    }

    // Verify user has access to the parent observation
    const observations = await this.observationRepository.findByAbsenceId(attachment.observationId);
    const observation = observations.find((obs) => obs.id === attachment.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${attachment.observationId} not found`);
    }

    // For simplicity, check if user is the owner
    // In a real scenario, check if user has access to the parent absence (RF-63)
    if (observation.userId !== query.userId) {
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
