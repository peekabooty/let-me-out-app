import { AbsenceStatus } from '@repo/types';

/**
 * DTO for upcoming absence information.
 *
 * Represents an upcoming absence for the dashboard view (RF-55).
 */
export class UpcomingAbsenceDto {
  id!: string;
  absenceTypeName!: string;
  startAt!: string;
  endAt!: string;
  duration!: number;
  status!: AbsenceStatus | null;
}
