export class UpdateAbsenceTypeCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly maxPerYear?: number,
    public readonly minDuration?: number,
    public readonly maxDuration?: number,
    public readonly requiresValidation?: boolean,
    public readonly allowPastDates?: boolean,
    public readonly minDaysInAdvance?: number | null
  ) {}
}
