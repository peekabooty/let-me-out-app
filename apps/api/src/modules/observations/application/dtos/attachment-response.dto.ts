/**
 * Response DTO for attachment metadata after upload or when listing attachments.
 */
export class AttachmentResponseDto {
  id: string;
  observationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;

  constructor(
    id: string,
    observationId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    createdAt: Date
  ) {
    this.id = id;
    this.observationId = observationId;
    this.filename = filename;
    this.mimeType = mimeType;
    this.sizeBytes = sizeBytes;
    this.createdAt = createdAt;
  }

  /**
   * Creates a DTO from a domain entity.
   *
   * @param {object} attachment - Domain attachment entity
   * @returns {AttachmentResponseDto}
   */
  static fromEntity(attachment: {
    id: string;
    observationId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }): AttachmentResponseDto {
    return new AttachmentResponseDto(
      attachment.id,
      attachment.observationId,
      attachment.filename,
      attachment.mimeType,
      attachment.sizeBytes,
      attachment.createdAt
    );
  }
}
