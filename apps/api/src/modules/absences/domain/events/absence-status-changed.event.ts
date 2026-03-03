import type { AbsenceStatus } from '@repo/types';

/**
 * Domain event emitted when an absence status changes.
 *
 * This event is used to trigger notifications to the absence creator.
 */
export class AbsenceStatusChangedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string,
    public readonly fromStatus: AbsenceStatus | null,
    public readonly toStatus: AbsenceStatus,
    public readonly changedBy: string,
    public readonly changedAt: Date
  ) {}
}
