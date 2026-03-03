import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ObservationAttachment } from '../domain/observation-attachment.entity';
import { ObservationAttachmentRepositoryPort } from '../domain/ports/observation-attachment.repository.port';
import { ObservationAttachmentMapper } from './observation-attachment.mapper';

/**
 * Prisma implementation of ObservationAttachmentRepositoryPort.
 *
 * @implements {ObservationAttachmentRepositoryPort}
 */
@Injectable()
export class ObservationAttachmentPrismaRepository implements ObservationAttachmentRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ObservationAttachmentMapper
  ) {}

  /**
   * Saves a new observation attachment to the database.
   *
   * @param {ObservationAttachment} attachment - The attachment entity to save
   * @returns {Promise<void>}
   */
  async save(attachment: ObservationAttachment): Promise<void> {
    const data = this.mapper.toPrismaCreate(attachment);
    await this.prisma.observation_attachment.create({ data });
  }

  /**
   * Finds an observation attachment by its ID.
   *
   * @param {string} id - The attachment ID
   * @returns {Promise<ObservationAttachment | null>} The attachment or null if not found
   */
  async findById(id: string): Promise<ObservationAttachment | null> {
    const attachment = await this.prisma.observation_attachment.findUnique({
      where: { id },
    });

    return attachment ? this.mapper.toDomain(attachment) : null;
  }

  /**
   * Finds all attachments for a specific observation.
   *
   * @param {string} observationId - The observation ID
   * @returns {Promise<ObservationAttachment[]>} Array of attachments
   */
  async findByObservationId(observationId: string): Promise<ObservationAttachment[]> {
    const attachments = await this.prisma.observation_attachment.findMany({
      where: { observation_id: observationId },
      orderBy: { created_at: 'asc' },
    });

    return attachments.map((attachment) => this.mapper.toDomain(attachment));
  }

  /**
   * Deletes an observation attachment by its ID.
   *
   * @param {string} id - The attachment ID
   * @returns {Promise<void>}
   */
  async delete(id: string): Promise<void> {
    await this.prisma.observation_attachment.delete({
      where: { id },
    });
  }
}
