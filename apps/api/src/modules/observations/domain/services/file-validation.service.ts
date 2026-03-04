import { Injectable, BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Service for validating file uploads.
 *
 * Implements:
 * - RF-60: Only JPEG, PNG, PDF allowed
 * - RF-61: Max 5 MB per file
 * - Non-negotiable 1.9: Validate MIME type with magic bytes
 */
@Injectable()
export class FileValidationService {
  protected async detectFileType(buffer: Buffer): Promise<{ mime: string } | undefined> {
    const { fileTypeFromBuffer } = await import('file-type');
    return fileTypeFromBuffer(buffer);
  }

  /**
   * Validates a file buffer and returns its validated MIME type.
   * Throws BadRequestException if validation fails.
   */
  async validateFile(buffer: Buffer, originalFilename: string): Promise<AllowedMimeType> {
    // RF-61: Check file size
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File "${originalFilename}" exceeds maximum size of 5 MB (${buffer.length} bytes)`
      );
    }

    // Non-negotiable 1.9: Validate MIME type using magic bytes
    const fileType = await this.detectFileType(buffer);

    if (!fileType) {
      throw new BadRequestException(
        `File "${originalFilename}" has an unknown or invalid file type`
      );
    }

    // RF-60: Check if MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime as AllowedMimeType)) {
      throw new BadRequestException(
        `File "${originalFilename}" has type "${fileType.mime}" which is not allowed. ` +
          `Allowed types: JPEG, PNG, PDF`
      );
    }

    return fileType.mime as AllowedMimeType;
  }

  /**
   * Gets the file extension for a validated MIME type.
   */
  getExtensionForMimeType(mimeType: AllowedMimeType): string {
    switch (mimeType) {
      case 'image/jpeg': {
        return 'jpg';
      }
      case 'image/png': {
        return 'png';
      }
      case 'application/pdf': {
        return 'pdf';
      }
      default: {
        throw new Error(`Unknown MIME type: ${mimeType}`);
      }
    }
  }
}
