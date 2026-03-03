import type { ObservationAttachment } from '../observation-attachment.entity';

export interface ObservationAttachmentRepositoryPort {
  /**
   * Saves a new observation attachment metadata to the database.
   */
  save(attachment: ObservationAttachment): Promise<void>;

  /**
   * Finds an observation attachment by ID.
   */
  findById(id: string): Promise<ObservationAttachment | null>;

  /**
   * Finds all attachments for a given observation.
   */
  findByObservationId(observationId: string): Promise<ObservationAttachment[]>;
}

export const OBSERVATION_ATTACHMENT_REPOSITORY_PORT = Symbol('ObservationAttachmentRepositoryPort');
