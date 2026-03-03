/**
 * DTO for pending validation absence information.
 *
 * Represents an absence pending validation for the validator dashboard (RF-55).
 */
export class PendingValidationDto {
  id!: string;
  userName!: string;
  absenceTypeName!: string;
  startAt!: string;
  endAt!: string;
  duration!: number;
  createdAt!: string;
}
