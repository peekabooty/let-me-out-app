import type { AbsenceStatus, AbsenceUnit, ValidationDecision } from '@repo/types';
import type { Absence } from '../absence.entity';

export interface AbsenceRepositoryPort {
  /**
   * Finds an absence by ID.
   */
  findById(id: string): Promise<Absence | null>;

  /**
   * Saves a new absence to the database.
   */
  save(absence: Absence): Promise<void>;

  /**
   * Updates an existing absence.
   */
  update(absence: Absence): Promise<void>;

  /**
   * Creates a status history record for an absence.
   */
  createStatusHistory(
    absenceId: string,
    fromStatus: AbsenceStatus | null,
    toStatus: AbsenceStatus,
    changedBy: string,
    changedAt: Date
  ): Promise<void>;

  /**
   * Calculates the total consumed duration for a user's absences of a specific type
   * within a given year.
   *
   * @param userId - The ID of the user
   * @param absenceTypeId - The ID of the absence type
   * @param year - The year to calculate for (e.g., 2024)
   * @param unit - The unit of measurement (HOURS or DAYS)
   * @returns The total consumed duration in the specified unit
   */
  calculateConsumedByUserAndTypeInYear(
    userId: string,
    absenceTypeId: string,
    year: number,
    unit: AbsenceUnit
  ): Promise<number>;

  /**
   * Checks if there is any overlap between the given date range and existing absences
   * for a specific user.
   *
   * @param userId - The ID of the user
   * @param startAt - Start date and time
   * @param endAt - End date and time
   * @param excludeAbsenceId - Optional absence ID to exclude from the check (for updates)
   * @returns True if there is an overlap, false otherwise
   */
  hasOverlap(
    userId: string,
    startAt: Date,
    endAt: Date,
    excludeAbsenceId?: string
  ): Promise<boolean>;

  /**
   * Creates a validation history record for an absence (RF-33, RF-77).
   *
   * @param absenceId - The ID of the absence
   * @param validatorId - The ID of the validator making the decision
   * @param decision - The validation decision (ACCEPTED or REJECTED)
   * @param decidedAt - The timestamp of the decision
   */
  createValidationHistory(
    absenceId: string,
    validatorId: string,
    decision: ValidationDecision,
    decidedAt: Date
  ): Promise<void>;

  /**
   * Gets all validation decisions for a specific absence.
   *
   * @param absenceId - The ID of the absence
   * @returns Array of validation history records
   */
  getValidationHistory(
    absenceId: string
  ): Promise<Array<{ validatorId: string; decision: ValidationDecision; decidedAt: Date }>>;

  /**
   * Gets the assigned validator IDs for an absence.
   *
   * @param absenceId - The ID of the absence
   * @returns Array of validator user IDs
   */
  getAssignedValidators(absenceId: string): Promise<string[]>;

  /**
   * Assigns validators to an absence.
   *
   * @param absenceId - The ID of the absence
   * @param validatorIds - Array of validator user IDs to assign
   * @param assignedAt - The timestamp of assignment
   */
  assignValidators(absenceId: string, validatorIds: string[], assignedAt: Date): Promise<void>;

  /**
   * Gets absences for the calendar view (RF-46, RF-69, RF-70).
   *
   * Returns:
   * - All absences of the specified user
   * - All absences of team members in teams the user belongs to
   * - Includes user name, absence type name, and team color
   *
   * @param userId - The ID of the user requesting the calendar view
   * @returns Array of calendar absences with additional display information
   */
  findCalendarAbsences(userId: string): Promise<
    Array<{
      id: string;
      userId: string;
      userName: string;
      absenceTypeId: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      status: AbsenceStatus | null;
      teamColor: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;

  /**
   * Finds upcoming absences for a user (RF-55).
   *
   * Returns absences with startAt >= current date, ordered by startAt ASC.
   * Limited to a reasonable number (e.g., 10 most recent).
   *
   * @param userId - The ID of the user
   * @returns Array of upcoming absences with absence type name
   */
  findUpcomingAbsences(userId: string): Promise<
    Array<{
      id: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      status: AbsenceStatus | null;
    }>
  >;

  /**
   * Finds absences pending validation by a specific validator (RF-55).
   *
   * Returns absences where:
   * - The validator is assigned to the absence
   * - The absence status is WAITING_VALIDATION or RECONSIDER
   * - Ordered by createdAt ASC (oldest first)
   *
   * @param validatorId - The ID of the validator user
   * @returns Array of absences pending validation with user and type names
   */
  findPendingValidations(validatorId: string): Promise<
    Array<{
      id: string;
      userName: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      createdAt: Date;
    }>
  >;

  /**
   * Finds all absences for a specific user, ordered by startAt DESC.
   *
   * @param userId - The ID of the user
   * @returns Array of absences with absence type name
   */
  findByUserId(userId: string): Promise<
    Array<{
      id: string;
      absenceTypeId: string;
      absenceTypeName: string;
      startAt: Date;
      endAt: Date;
      duration: number;
      status: AbsenceStatus | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;

  /**
   * Gets the full status history for an absence, ordered by changedAt ASC (RF-53, RF-54).
   *
   * @param absenceId - The ID of the absence
   * @returns Array of status history records
   */
  getStatusHistory(absenceId: string): Promise<
    Array<{
      id: string;
      fromStatus: AbsenceStatus | null;
      toStatus: AbsenceStatus;
      changedBy: string;
      changedAt: Date;
    }>
  >;
}

export const ABSENCE_REPOSITORY_PORT = Symbol('AbsenceRepositoryPort');
