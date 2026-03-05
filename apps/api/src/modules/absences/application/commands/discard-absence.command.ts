/**
 * Command to discard an absence from RECONSIDER state.
 *
 * Implements RF-31: From RECONSIDER, the user can decide not to continue → DISCARDED.
 */
export class DiscardAbsenceCommand {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
