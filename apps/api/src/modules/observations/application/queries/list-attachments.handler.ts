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
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../../absences/domain/ports/absence.repository.port';
import { AttachmentResponseDto } from '../dtos/attachment-response.dto';

/**
 * Handler for ListAttachmentsQuery.
 * Returns all attachments for a given observation.
 *
 * Implements RF-59: Only involved users (creator + validators) can list attachments.
 *
 * @implements {IQueryHandler<ListAttachmentsQuery>}
 */
@QueryHandler(ListAttachmentsQuery)
export class ListAttachmentsHandler implements IQueryHandler<ListAttachmentsQuery> {
  constructor(
    @Inject(OBSERVATION_ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: ObservationAttachmentRepositoryPort,
    @Inject(OBSERVATION_REPOSITORY_PORT)
    private readonly observationRepository: ObservationRepositoryPort,
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  /**
   * Executes the list attachments query.
   *
   * @param {ListAttachmentsQuery} query - The query containing observation ID and user ID
   * @returns {Promise<AttachmentResponseDto[]>} Array of attachment metadata
   * @throws {NotFoundException} If the observation does not exist
   * @throws {ForbiddenException} If the user is not the creator or an assigned validator
   */
  async execute(query: ListAttachmentsQuery): Promise<AttachmentResponseDto[]> {
    // Verify observation exists
    const observation = await this.observationRepository.findById(query.observationId);

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${query.observationId} not found`);
    }

    // Verify the parent absence exists
    const absence = await this.absenceRepository.findById(observation.absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${observation.absenceId} not found`);
    }

    // RF-59: Verify user is involved (absence creator or assigned validator)
    const isCreator = absence.userId === query.userId;
    const assignedValidators = await this.absenceRepository.getAssignedValidators(
      observation.absenceId
    );
    const isValidator = assignedValidators.includes(query.userId);

    if (!isCreator && !isValidator) {
      throw new ForbiddenException(
        'You do not have permission to view attachments for this observation'
      );
    }

    // Retrieve attachments
    const attachments = await this.attachmentRepository.findByObservationId(query.observationId);

    return attachments.map((attachment) => AttachmentResponseDto.fromEntity(attachment));
  }
}
