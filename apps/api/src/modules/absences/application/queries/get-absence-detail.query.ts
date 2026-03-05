/**
 * Query to get the detail of a specific absence (RF-54).
 */
export class GetAbsenceDetailQuery {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
