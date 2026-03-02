/**
 * Command to cancel an accepted absence before its start date.
 *
 * Implements RF-51 (cancellation before start) and RF-52 (cancelled as final state).
 */
export class CancelAbsenceCommand {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
