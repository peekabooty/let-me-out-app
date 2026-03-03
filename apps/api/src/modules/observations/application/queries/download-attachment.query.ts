/**
 * Query to download an attachment file.
 */
export class DownloadAttachmentQuery {
  constructor(
    public readonly attachmentId: string,
    public readonly userId: string
  ) {}
}
