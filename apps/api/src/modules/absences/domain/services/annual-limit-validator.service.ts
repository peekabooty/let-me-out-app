import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import type { AbsenceUnit } from '@repo/types';
import { AbsenceRepositoryPort, ABSENCE_REPOSITORY_PORT } from '../ports/absence.repository.port';

/**
 * Service responsible for validating annual limits for absence types.
 *
 * Ensures that users do not exceed their allowed annual quota
 * for a specific absence type.
 */
@Injectable()
export class AnnualLimitValidatorService {
  constructor(
    @Inject(ABSENCE_REPOSITORY_PORT)
    private readonly absenceRepository: AbsenceRepositoryPort
  ) {}

  /**
   * Validates whether creating an absence would exceed the user's annual limit.
   *
   * @param userId - The ID of the user
   * @param absenceTypeId - The ID of the absence type
   * @param requestedDuration - The duration of the new absence
   * @param unit - The unit of the absence (HOURS or DAYS)
   * @param year - The year to validate against
   * @param annualLimit - The maximum allowed per year
   * @throws BadRequestException if the limit would be exceeded
   */
  async validateLimit(
    userId: string,
    absenceTypeId: string,
    requestedDuration: number,
    unit: AbsenceUnit,
    year: number,
    annualLimit: number
  ): Promise<void> {
    const remaining = await this.calculateRemainingBalance(
      userId,
      absenceTypeId,
      year,
      annualLimit,
      unit
    );

    if (requestedDuration > remaining) {
      throw new BadRequestException(
        `The requested absence duration exceeds the remaining annual limit. ` +
          `Requested: ${requestedDuration} ${unit.toUpperCase()}, Remaining: ${remaining} ${unit.toUpperCase()}`
      );
    }
  }

  /**
   * Calculates the remaining balance for a user's absence type in a given year.
   *
   * @param userId - The ID of the user
   * @param absenceTypeId - The ID of the absence type
   * @param year - The year to calculate for
   * @param annualLimit - The maximum allowed per year
   * @param unit - The unit of the absence (HOURS or DAYS)
   * @returns The remaining balance in the absence type's unit
   */
  async calculateRemainingBalance(
    userId: string,
    absenceTypeId: string,
    year: number,
    annualLimit: number,
    unit: AbsenceUnit
  ): Promise<number> {
    const consumed = await this.absenceRepository.calculateConsumedByUserAndTypeInYear(
      userId,
      absenceTypeId,
      year,
      unit
    );

    const remaining = annualLimit - consumed;

    return Math.max(0, remaining);
  }
}
