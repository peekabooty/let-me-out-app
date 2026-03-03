export interface FileStoragePort {
  /**
   * Saves a file to disk with the given stored filename.
   * @param buffer - The file buffer
   * @param storedFilename - The filename to use for storage (UUID + extension)
   * @returns The full path where the file was saved
   */
  saveFile(buffer: Buffer, storedFilename: string): Promise<string>;

  /**
   * Retrieves a file from disk.
   * @param storedFilename - The stored filename
   * @returns The file buffer or null if not found
   */
  getFile(storedFilename: string): Promise<Buffer | null>;

  /**
   * Deletes a file from disk.
   * @param storedFilename - The stored filename
   */
  deleteFile(storedFilename: string): Promise<void>;
}

export const FILE_STORAGE_PORT = Symbol('FileStoragePort');
