import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FileStoragePort } from '../domain/ports/file-storage.port';

/**
 * Local file system implementation of FileStoragePort.
 * Stores files in a configured directory outside the public web root.
 *
 * @implements {FileStoragePort}
 */
@Injectable()
export class LocalFileStorageService implements FileStoragePort {
  private readonly logger = new Logger(LocalFileStorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOADS_DIR') || './uploads';
  }

  /**
   * Ensures the upload directory exists, creating it if necessary.
   *
   * @private
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Saves a file to the local filesystem.
   *
   * @param {Buffer} buffer - The file content as a buffer
   * @param {string} storedFilename - The generated filename (UUID v7 + extension)
   * @returns {Promise<string>} The full path where the file was saved
   * @throws {Error} If the file cannot be written
   */
  async saveFile(buffer: Buffer, storedFilename: string): Promise<string> {
    await this.ensureUploadDir();
    const filePath = path.join(this.uploadDir, storedFilename);

    try {
      await fs.writeFile(filePath, buffer);
      this.logger.log(`File saved successfully`);
      return filePath;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save file: ${message}`);
      throw new Error('Failed to save file to storage');
    }
  }

  /**
   * Retrieves a file from the local filesystem.
   *
   * @param {string} storedFilename - The stored filename to retrieve
   * @returns {Promise<Buffer | null>} The file content as a buffer or null if not found
   */
  async getFile(storedFilename: string): Promise<Buffer | null> {
    const filePath = path.join(this.uploadDir, storedFilename);

    try {
      const buffer = await fs.readFile(filePath);
      this.logger.log(`File retrieved successfully`);
      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve file: ${message}`);
      return null;
    }
  }

  /**
   * Deletes a file from the local filesystem.
   *
   * @param {string} storedFilename - The stored filename to delete
   * @returns {Promise<void>}
   * @throws {Error} If the file cannot be deleted
   */
  async deleteFile(storedFilename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, storedFilename);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file: ${message}`);
      throw new Error('Failed to delete file from storage');
    }
  }
}
