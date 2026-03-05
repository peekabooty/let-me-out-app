import type { UserRole } from '@repo/types';

/**
 * Query to list absences according to the caller's role.
 *
 * - STANDARD: own absences only (RF-38)
 * - VALIDATOR: own + assigned-as-validator absences (RF-39)
 * - AUDITOR:   all absences (RF-40)
 * - ADMIN:     not allowed (RF-41)
 */
export class ListAbsencesByRoleQuery {
  constructor(
    public readonly userId: string,
    public readonly role: UserRole
  ) {}
}
