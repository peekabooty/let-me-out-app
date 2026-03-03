import { observation_attachment as PrismaObservationAttachment } from '@prisma/client';
import { ObservationAttachment } from '../domain/observation-attachment.entity';

/**
 * Maps between Prisma observation_attachment model and domain ObservationAttachment entity.
 */
export const ObservationAttachmentMapper = {
  /**
   * Maps a Prisma observation_attachment to a domain ObservationAttachment entity.
   *
   * @param {PrismaObservationAttachment} prismaAttachment - The Prisma model
   * @returns {ObservationAttachment} The domain entity
   */
  toDomain(prismaAttachment: PrismaObservationAttachment): ObservationAttachment {
    return new ObservationAttachment({
      id: prismaAttachment.id,
      observationId: prismaAttachment.observation_id,
      filename: prismaAttachment.filename,
      storedFilename: prismaAttachment.stored_filename,
      mimeType: prismaAttachment.mime_type,
      sizeBytes: prismaAttachment.size_bytes,
      createdAt: prismaAttachment.created_at,
    });
  },

  /**
   * Maps a domain ObservationAttachment entity to Prisma create input.
   *
   * @param {ObservationAttachment} attachment - The domain entity
   * @returns {object} Prisma create input data
   */
  toPrismaCreate(attachment: ObservationAttachment): {
    id: string;
    observation_id: string;
    filename: string;
    stored_filename: string;
    mime_type: string;
    size_bytes: number;
    created_at: Date;
  } {
    return {
      id: attachment.id,
      observation_id: attachment.observationId,
      filename: attachment.filename,
      stored_filename: attachment.storedFilename,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_at: attachment.createdAt,
    };
  },
};
