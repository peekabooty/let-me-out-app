import { Injectable } from '@nestjs/common';
import { differenceInHours, eachDayOfInterval, isWeekend, startOfDay, endOfDay } from 'date-fns';

import { AbsenceUnit } from '@repo/types';
import { ClockService } from '../../../../common/clock/clock.service';

/**
 * Service responsible for calculating absence duration in hours or business days.
 *
 * Business days are Monday to Friday (weekends excluded).
 * Holidays are not considered in this version.
 */
@Injectable()
export class DurationCalculatorService {
  constructor(private readonly clockService: ClockService) {}

  /**
   * Calculates the duration between two dates based on the unit type.
   *
   * @param startAt - Start date and time of the absence
   * @param endAt - End date and time of the absence
   * @param unit - Unit type (HOURS or DAYS)
   * @returns The calculated duration as a number
   */
  calculateDuration(startAt: Date, endAt: Date, unit: AbsenceUnit): number {
    if (unit === AbsenceUnit.HOURS) {
      return this.calculateHours(startAt, endAt);
    }

    return this.calculateBusinessDays(startAt, endAt);
  }

  /**
   * Calculates the duration in hours between two dates.
   *
   * @param startAt - Start date and time
   * @param endAt - End date and time
   * @returns The duration in hours (can be decimal)
   */
  private calculateHours(startAt: Date, endAt: Date): number {
    const hours = differenceInHours(endAt, startAt, { roundingMethod: 'ceil' });
    return Math.max(0, hours);
  }

  /**
   * Calculates the duration in business days (Monday to Friday) between two dates.
   *
   * Only complete days are counted. Partial days are rounded up to 1 day.
   * If start and end dates are the same day, it counts as 1 business day.
   *
   * @param startAt - Start date and time
   * @param endAt - End date and time
   * @returns The duration in business days
   */
  private calculateBusinessDays(startAt: Date, endAt: Date): number {
    if (endAt < startAt) {
      return 0;
    }

    const start = startOfDay(startAt);
    const end = endOfDay(endAt);

    const allDays = eachDayOfInterval({ start, end });

    const businessDays = allDays.filter((day: Date) => !isWeekend(day));

    return businessDays.length;
  }
}
