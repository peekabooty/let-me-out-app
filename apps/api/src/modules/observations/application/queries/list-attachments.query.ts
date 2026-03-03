/**
 * Query to list all attachments for an observation.
 */
export class ListAttachmentsQuery {
  constructor(
    public readonly observationId: string,
    public readonly userId: string
  ) {}
}
