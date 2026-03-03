import type { AbsenceStatus } from '@repo/types';

/**
 * Domain event emitted when an absence is created.
 *
 * This event is used to trigger notifications to validators.
 */
export class AbsenceCreatedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly userId: string,
    public readonly absenceTypeId: string,
    public readonly startAt: Date,
    public readonly endAt: Date,
    public readonly duration: number,
    public readonly status: AbsenceStatus | null,
    public readonly validatorIds: string[]
  ) {}
}
