import { AbsenceStatus } from '@repo/types';

/**
 * DTO for calendar absence response.
 *
 * Includes additional information for calendar display:
 * - isOwn: Whether this absence belongs to the requesting user
 * - teamColor: Color for team absences (null for own absences)
 * - userName: Name of the user who created the absence
 * - absenceTypeName: Name of the absence type
 */
export class CalendarAbsenceResponseDto {
  id!: string;
  userId!: string;
  userName!: string;
  absenceTypeId!: string;
  absenceTypeName!: string;
  startAt!: string;
  endAt!: string;
  duration!: number;
  status!: AbsenceStatus | null;
  isOwn!: boolean;
  teamColor!: string | null;
  avatarUrl!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
