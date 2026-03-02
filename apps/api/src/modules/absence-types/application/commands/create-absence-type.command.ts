import { AbsenceUnit } from '@repo/types';

export class CreateAbsenceTypeCommand {
  constructor(
    public readonly name: string,
    public readonly unit: AbsenceUnit,
    public readonly maxPerYear: number,
    public readonly minDuration: number,
    public readonly maxDuration: number,
    public readonly requiresValidation: boolean,
    public readonly allowPastDates: boolean,
    public readonly minDaysInAdvance: number | null
  ) {}
}
