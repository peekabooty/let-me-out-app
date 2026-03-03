import { AbsenceTypeBalanceDto } from './absence-type-balance.dto';
import { UpcomingAbsenceDto } from './upcoming-absence.dto';
import { PendingValidationDto } from './pending-validation.dto';

/**
 * DTO for dashboard response (RF-55).
 *
 * Includes:
 * - Balance for each absence type (consumed vs remaining)
 * - Upcoming absences (future absences)
 * - Pending validations (only for validators)
 */
export class DashboardResponseDto {
  balances!: AbsenceTypeBalanceDto[];
  upcomingAbsences!: UpcomingAbsenceDto[];
  pendingValidations!: PendingValidationDto[];
}
