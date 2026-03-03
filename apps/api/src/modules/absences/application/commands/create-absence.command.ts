export class CreateAbsenceCommand {
  constructor(
    public readonly userId: string,
    public readonly absenceTypeId: string,
    public readonly startAt: Date,
    public readonly endAt: Date,
    public readonly validatorIds: string[] = []
  ) {}
}
