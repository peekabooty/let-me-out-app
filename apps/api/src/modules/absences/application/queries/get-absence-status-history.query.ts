/**
 * Query to get the status history of a specific absence (RF-53, RF-54).
 */
export class GetAbsenceStatusHistoryQuery {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
