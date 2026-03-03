/**
 * Query to get calendar absences for a user.
 *
 * Implements RF-46 (calendar view), RF-69 (team absences), and RF-70 (color distinction).
 *
 * Returns:
 * - All absences of the requesting user (regardless of status)
 * - All absences of team members in shared teams
 * - Includes team color information for proper frontend rendering
 */
export class GetCalendarAbsencesQuery {
  constructor(public readonly userId: string) {}
}
