import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AbsenceRepositoryPort, ABSENCE_REPOSITORY_PORT } from '../ports/absence.repository.port';

/**
 * Domain service for validating that an absence does not overlap with existing absences.
 *
 * Business rules enforced (RF-50):
 * - A user cannot have overlapping absences (same user, overlapping time periods)
 * - Overlaps are checked against all existing absences except the current one (if editing)
 */
@Injectable()
export class OverlapValidatorService {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  /**
   * Validates that the given absence time period does not overlap with any existing absence
   * for the specified user.
   *
   * @param userId - The ID of the user creating the absence
   * @param startAt - The start datetime of the absence
   * @param endAt - The end datetime of the absence
   * @param excludeAbsenceId - Optional ID of an absence to exclude from overlap check (for edits)
   * @throws {BadRequestException} If an overlap is detected
   */
  async validate(
    userId: string,
    startAt: Date,
    endAt: Date,
    excludeAbsenceId?: string
  ): Promise<void> {
    const hasOverlap = await this.absenceRepository.hasOverlap(
      userId,
      startAt,
      endAt,
      excludeAbsenceId
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'The requested absence period overlaps with an existing absence'
      );
    }
  }
}
