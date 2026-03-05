/**
 * Command to resend an absence for validation from RECONSIDER state.
 *
 * Implements RF-31: From RECONSIDER, the user can resend for validation → WAITING_VALIDATION.
 */
export class ReconsiderAbsenceCommand {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
