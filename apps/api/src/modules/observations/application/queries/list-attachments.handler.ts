import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ListAttachmentsQuery } from './list-attachments.query';
import {
  ObservationAttachmentRepositoryPort,
  OBSERVATION_ATTACHMENT_REPOSITORY_PORT,
} from '../../domain/ports/observation-attachment.repository.port';
import {
  ObservationRepositoryPort,
  OBSERVATION_REPOSITORY_PORT,
} from '../../domain/ports/observation.repository.port';
import { AttachmentResponseDto } from '../dtos/attachment-response.dto';

/**
 * Handler for ListAttachmentsQuery.
 * Returns all attachments for a given observation.
 *
 * @implements {IQueryHandler<ListAttachmentsQuery>}
 */
@QueryHandler(ListAttachmentsQuery)
export class ListAttachmentsHandler implements IQueryHandler<ListAttachmentsQuery> {
  constructor(
    @Inject(OBSERVATION_ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: ObservationAttachmentRepositoryPort,
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort
  ) {}

  /**
   * Executes the list attachments query.
   *
   * @param {ListAttachmentsQuery} query - The query containing observation ID and user ID
   * @returns {Promise<AttachmentResponseDto[]>} Array of attachment metadata
   * @throws {NotFoundException} If the observation does not exist
   * @throws {ForbiddenException} If the user doesn't have access to the observation
   */
  async execute(query: ListAttachmentsQuery): Promise<AttachmentResponseDto[]> {
    // Verify observation exists and user has access
    const observations = await this.observationRepository.findByAbsenceId(query.observationId);
    const observation = observations.find((obs) => obs.id === query.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${query.observationId} not found`);
    }

    // For simplicity, check if user is the owner
    // In a real scenario, check if user has access to the parent absence
    if (observation.userId !== query.userId) {
      throw new ForbiddenException(
        'You do not have permission to view attachments for this observation'
      );
    }

    // Retrieve attachments
    const attachments = await this.attachmentRepository.findByObservationId(query.observationId);

    return attachments.map((attachment) => AttachmentResponseDto.fromEntity(attachment));
  }
}
