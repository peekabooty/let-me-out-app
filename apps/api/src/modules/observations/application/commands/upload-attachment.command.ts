/**
 * Command to upload an attachment to an observation.
 */
export class UploadAttachmentCommand {
  constructor(
    public readonly observationId: string,
    public readonly originalFilename: string,
    public readonly buffer: Buffer,
    public readonly userId: string
  ) {}
}
