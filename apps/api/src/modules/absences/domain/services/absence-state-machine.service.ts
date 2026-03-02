import { Injectable } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

/**
 * Domain service that manages absence status transitions according to RF-29 to RF-32.
 *
 * RF-29: Possible states for absences with validation workflow:
 *   - WAITING_VALIDATION (initial state)
 *   - RECONSIDER
 *   - DISCARDED (final state)
 *   - ACCEPTED (final state)
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
 * RF-32: ACCEPTED and DISCARDED are final states; no further transitions allowed.
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

    // RF-32: No transitions from final states
    if (this.isFinalState(fromStatus)) {
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

    return false;
  }

  /**
   * Checks if a status is a final state (RF-32).
   */
  isFinalState(status: AbsenceStatus | null): boolean {
    return (
      status === AbsenceStatus.ACCEPTED ||
      status === AbsenceStatus.DISCARDED ||
      status === AbsenceStatus.CANCELLED ||
      status === null
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
