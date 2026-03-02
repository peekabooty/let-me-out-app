import type { AbsenceStatus, AbsenceUnit } from '@repo/types';
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
}

export const ABSENCE_REPOSITORY_PORT = Symbol('AbsenceRepositoryPort');
