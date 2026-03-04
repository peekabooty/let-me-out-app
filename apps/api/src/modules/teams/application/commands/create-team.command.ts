export class CreateTeamCommand {
  constructor(
    public readonly name: string,
    public readonly color: string
  ) {}
}
