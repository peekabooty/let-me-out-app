export interface ObservationAttachmentProps {
  id: string;
  observationId: string;
  filename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export class ObservationAttachment {
  readonly id: string;
  readonly observationId: string;
  readonly filename: string;
  readonly storedFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;

  constructor(props: ObservationAttachmentProps) {
    this.id = props.id;
    this.observationId = props.observationId;
    this.filename = props.filename;
    this.storedFilename = props.storedFilename;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.createdAt = props.createdAt;
  }
}
