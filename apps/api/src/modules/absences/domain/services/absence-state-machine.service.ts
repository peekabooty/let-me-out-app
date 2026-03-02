import { Injectable } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

/**
 * Domain service that manages absence status transitions according to RF-29 to RF-32, RF-51, RF-52.
 *
 * RF-29: Possible states for absences with validation workflow:
 *   - WAITING_VALIDATION (initial state)
 *   - RECONSIDER
 *   - DISCARDED (final state)
 *   - ACCEPTED (can transition to CANCELLED per RF-51)
 *   - CANCELLED (final state)
 *
 * RF-30: From WAITING_VALIDATION:
 *   - If at least one validator rejects → RECONSIDER
 *   - If all validators accept → ACCEPTED
 *
 * RF-31: From RECONSIDER:
 *   - User can resend for validation → WAITING_VALIDATION
 *   - User can decide not to continue → DISCARDED
 *
 * RF-32: DISCARDED is a final state; no further transitions allowed.
 *
 * RF-51: From ACCEPTED:
 *   - Creator can cancel before start date → CANCELLED
 *
 * RF-52: CANCELLED is a final state; no further transitions allowed.
 */
@Injectable()
export class AbsenceStateMachineService {
  /**
   * Checks if a status transition is valid according to the business rules.
   */
  isTransitionValid(fromStatus: AbsenceStatus | null, toStatus: AbsenceStatus): boolean {
    // Initial creation (no status → WAITING_VALIDATION) is handled in CreateAbsenceHandler
    if (fromStatus === null) {
      return toStatus === AbsenceStatus.WAITING_VALIDATION;
    }

    // RF-32, RF-52: No transitions from DISCARDED or CANCELLED
    if (fromStatus === AbsenceStatus.DISCARDED || fromStatus === AbsenceStatus.CANCELLED) {
      return false;
    }

    // RF-30: From WAITING_VALIDATION
    if (fromStatus === AbsenceStatus.WAITING_VALIDATION) {
      return (
        toStatus === AbsenceStatus.RECONSIDER ||
        toStatus === AbsenceStatus.ACCEPTED ||
        toStatus === AbsenceStatus.CANCELLED
      );
    }

    // RF-31: From RECONSIDER
    if (fromStatus === AbsenceStatus.RECONSIDER) {
      return (
        toStatus === AbsenceStatus.WAITING_VALIDATION ||
        toStatus === AbsenceStatus.DISCARDED ||
        toStatus === AbsenceStatus.CANCELLED
      );
    }

    // RF-51: From ACCEPTED, can transition to CANCELLED before start date
    if (fromStatus === AbsenceStatus.ACCEPTED) {
      return toStatus === AbsenceStatus.CANCELLED;
    }

    return false;
  }

  /**
   * Checks if a status is a final state (RF-32, RF-52).
   * CANCELLED and DISCARDED are truly final.
   * ACCEPTED can transition to CANCELLED per RF-51.
   */
  isFinalState(status: AbsenceStatus | null): boolean {
    return (
      status === AbsenceStatus.DISCARDED || status === AbsenceStatus.CANCELLED || status === null
    );
  }

  /**
   * Validates a status transition and throws if invalid.
   */
  validateTransition(fromStatus: AbsenceStatus | null, toStatus: AbsenceStatus): void {
    if (!this.isTransitionValid(fromStatus, toStatus)) {
      throw new Error(`Invalid status transition from ${fromStatus ?? 'null'} to ${toStatus}`);
    }
  }
}
