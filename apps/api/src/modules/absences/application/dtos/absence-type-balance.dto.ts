import { AbsenceUnit } from '@repo/types';

/**
 * DTO for absence type balance information.
 *
 * Represents the remaining balance for a specific absence type
 * in the current year (RF-55).
 */
export class AbsenceTypeBalanceDto {
  absenceTypeId!: string;
  absenceTypeName!: string;
  unit!: AbsenceUnit;
  maxPerYear!: number;
  consumed!: number;
  remaining!: number;
}
