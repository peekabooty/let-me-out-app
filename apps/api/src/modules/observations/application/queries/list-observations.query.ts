/**
 * Query to list all observations for a specific absence.
 *
 * Implements RF-35 (observation section) and RF-36 (only involved users can view).
 */
export class ListObservationsQuery {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string
  ) {}
}
