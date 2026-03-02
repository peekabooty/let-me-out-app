import { AbsenceUnit } from '@repo/types';

export class AbsenceTypeResponseDto {
  id!: string;
  name!: string;
  unit!: AbsenceUnit;
  maxPerYear!: number;
  minDuration!: number;
  maxDuration!: number;
  requiresValidation!: boolean;
  allowPastDates!: boolean;
  minDaysInAdvance!: number | null;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
