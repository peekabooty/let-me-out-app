/**
 * Command to create a new observation on an absence.
 *
 * Implements RF-35 (observation section) and RF-36 (only involved users can create).
 */
export class CreateObservationCommand {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string,
    public readonly content: string
  ) {}
}
