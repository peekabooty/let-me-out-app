/**
 * Query to get dashboard data for a user (RF-55).
 *
 * Returns:
 * - Balance for each absence type (consumed vs remaining in the current year)
 * - Upcoming absences (future absences)
 * - Pending validations (only for validators)
 */
export class GetDashboardQuery {
  constructor(public readonly userId: string) {}
}
